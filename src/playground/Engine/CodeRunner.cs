using System.Diagnostics;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Playground.Model;

namespace Playground.Engine;

public sealed record CodeDiagnostic(int Line, int Column, string Id, string Message, bool IsError);

public sealed class RunResult
{
    public bool Compiled { get; init; }
    public List<CodeDiagnostic> Diagnostics { get; init; } = new();
    public List<OutputItem> Output { get; init; } = new();
    public List<SqlCommandEntry> Commands { get; init; } = new();
    public int TrackedEntities { get; init; }
    public double CompileMs { get; init; }
    public double RunMs { get; init; }
}

/// <summary>Compiles playground code with Roslyn and runs it against the in-browser SQLite database.</summary>
public sealed class CodeRunner(HttpClient http)
{
    // Wrapper around the user's statements. "#line 1" maps diagnostics to the editor's line numbers.
    const string Prefix = """
        using System;
        using System.Collections.Generic;
        using System.Diagnostics;
        using System.Linq;
        using System.Threading.Tasks;
        using Microsoft.EntityFrameworkCore;
        using Playground.Model;
        using Playground.Engine;

        public static class __Playground
        {
            public static async Task __Run(ShopContext db)
            {
        #line 1 "Program.cs"

        """;
    const string Suffix = """

        #line default
            }
        }
        """;

    // Reference assemblies loaded up front; anything else is added on demand (CS0012).
    static readonly string[] CoreReferences =
    [
        "System.Runtime", "System.Collections", "System.Console", "System.Linq", "System.Linq.Expressions",
        "System.Linq.Queryable", "System.ComponentModel.Primitives", "System.ComponentModel.TypeConverter",
        "System.ComponentModel.Annotations", "System.Data.Common", "System.Memory", "System.ObjectModel",
        "System.Text.RegularExpressions", "System.Diagnostics.DiagnosticSource", "System.Threading",
        "Microsoft.EntityFrameworkCore", "Microsoft.EntityFrameworkCore.Abstractions", "Microsoft.EntityFrameworkCore.Relational",
        "Microsoft.EntityFrameworkCore.Sqlite", "Microsoft.Data.Sqlite", "Microsoft.Extensions.Logging.Abstractions",
        "EfPlayground",
    ];

    readonly Dictionary<string, MetadataReference> references = new(StringComparer.OrdinalIgnoreCase);
    Task? warmUp;

    public bool IsReady => warmUp?.IsCompletedSuccessfully == true;

    /// <summary>Downloads the core references and compiles a tiny program once, so the first real run is faster.</summary>
    public Task WarmUpAsync() => warmUp ??= Task.Run(async () =>
    {
        await Task.WhenAll(CoreReferences.Select(EnsureReference));
        Compile("var x = db.Customers.Where(c => c.Id > 0).Select(c => c.Name).Take(1);");
    });

    async Task EnsureReference(string name)
    {
        if (references.ContainsKey(name)) return;
        // References are stored gzip-compressed (build_playground.py) to keep the site small
        await using var gz = new System.IO.Compression.GZipStream(await http.GetStreamAsync($"refs/{name}.dll.gz"), System.IO.Compression.CompressionMode.Decompress);
        using var ms = new MemoryStream();
        await gz.CopyToAsync(ms);
        references[name] = MetadataReference.CreateFromImage(ms.ToArray());
    }

    (CSharpCompilation compilation, Microsoft.CodeAnalysis.Emit.EmitResult emit, byte[] image) Compile(string code)
    {
        var tree = CSharpSyntaxTree.ParseText(Prefix + code + Suffix, new CSharpParseOptions(LanguageVersion.Latest));
        var compilation = CSharpCompilation.Create("Playground_" + Guid.NewGuid().ToString("N"), [tree], references.Values,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary, optimizationLevel: OptimizationLevel.Release,
                nullableContextOptions: NullableContextOptions.Disable));
        using var ms = new MemoryStream();
        var emit = compilation.Emit(ms);
        return (compilation, emit, ms.ToArray());
    }

    public async Task<RunResult> RunAsync(string code, Database database)
    {
        await WarmUpAsync();
        var sw = Stopwatch.StartNew();
        var (_, emit, image) = Compile(code);

        // Add references the compiler asks for (e.g. a type defined in an assembly that is not referenced)
        for (var attempt = 0; !emit.Success && attempt < 4; attempt++)
        {
            var missing = emit.Diagnostics.Where(d => d.Id == "CS0012")
                .Select(d => Regex.Match(d.GetMessage(), "assembly '([^,']+)").Groups[1].Value)
                .Where(n => n.Length > 0 && !references.ContainsKey(n)).Distinct().ToList();
            if (missing.Count == 0) break;
            foreach (var name in missing) { try { await EnsureReference(name); } catch (HttpRequestException) { } }
            (_, emit, image) = Compile(code);
        }
        var compileMs = sw.Elapsed.TotalMilliseconds;

        var diagnostics = emit.Diagnostics
            .Where(d => d.Severity >= DiagnosticSeverity.Warning && d.Location.IsInSource)
            .Select(d =>
            {
                var span = d.Location.GetMappedLineSpan();
                return new CodeDiagnostic(span.StartLinePosition.Line + 1, span.StartLinePosition.Character + 1, d.Id, d.GetMessage(), d.Severity == DiagnosticSeverity.Error);
            })
            .Where(d => d.IsError || d.Id is not ("CS1998" or "CS0168" or "CS0219"))   // hide noise for snippets
            .OrderBy(d => d.Line).ToList();
        if (!emit.Success) return new RunResult { Compiled = false, Diagnostics = diagnostics, CompileMs = compileMs };

        var output = new OutputSink();
        var recorder = new CommandRecorder();
        var options = new DbContextOptionsBuilder<ShopContext>()
            .UseSqlite(database.Connection)
            .AddInterceptors(recorder)
            .LogTo(m => output.Add(new OutputItem { Kind = OutputItemKind.Warning, Text = Regex.Replace(m.Trim(), @"\s*\n\s*", "\n") }),
                   (id, level) => level == LogLevel.Warning,
                   DbContextLoggerOptions.Id)   // event id + message, no timestamp noise
            .Options;

        var previousOut = Console.Out;
        OutputSink.Current = output;
        Console.SetOut(output);
        var tracked = 0;
        sw.Restart();
        try
        {
            var assembly = Assembly.Load(image);
            var entry = assembly.GetType("__Playground")!.GetMethod("__Run")!;
            await using var db = new ShopContext(options);
            try
            {
                await (Task)entry.Invoke(null, [db])!;
            }
            finally
            {
                tracked = db.ChangeTracker.Entries().Count();
            }
        }
        catch (Exception ex)
        {
            var real = ex is TargetInvocationException { InnerException: { } inner } ? inner : ex;
            output.Add(new OutputItem { Kind = OutputItemKind.Error, Title = real.GetType().Name, Text = real.Message + ExceptionLine(real) });
        }
        finally
        {
            Console.SetOut(previousOut);
            OutputSink.Current = null;
        }

        return new RunResult
        {
            Compiled = true, Diagnostics = diagnostics, Output = output.Items, Commands = recorder.Entries,
            TrackedEntities = tracked, CompileMs = compileMs, RunMs = sw.Elapsed.TotalMilliseconds,
        };
    }

    static string ExceptionLine(Exception ex)
    {
        var frame = new StackTrace(ex, true).GetFrames()?.FirstOrDefault(f => f.GetFileName() == "Program.cs");
        return frame?.GetFileLineNumber() is > 0 and var line ? $"\n(at line {line})" : "";
    }
}
