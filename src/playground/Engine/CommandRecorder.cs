using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Playground.Engine;

public sealed record SqlCommandEntry(int Number, string Kind, string Sql, string Parameters, double DurationMs, string? Error);

/// <summary>Records every command EF Core sends (sync and async), with parameters and duration.</summary>
public sealed class CommandRecorder : DbCommandInterceptor
{
    public List<SqlCommandEntry> Entries { get; } = new();

    void Add(DbCommand cmd, string kind, TimeSpan duration, string? error = null)
    {
        var ps = string.Join(", ", cmd.Parameters.Cast<DbParameter>().Select(p => $"{p.ParameterName}={Format(p.Value)}"));
        Entries.Add(new SqlCommandEntry(Entries.Count + 1, kind, cmd.CommandText, ps, duration.TotalMilliseconds, error));
    }

    static string Format(object? v) => v switch { null or DBNull => "NULL", string s => $"'{s}'", DateTime d => $"'{d:yyyy-MM-dd HH:mm:ss}'", _ => Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture) ?? "" };

    public override DbDataReader ReaderExecuted(DbCommand c, CommandExecutedEventData e, DbDataReader r) { Add(c, "query", e.Duration); return r; }
    public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand c, CommandExecutedEventData e, DbDataReader r, CancellationToken ct = default) { Add(c, "query", e.Duration); return ValueTask.FromResult(r); }
    public override int NonQueryExecuted(DbCommand c, CommandExecutedEventData e, int r) { Add(c, $"non-query ({r} rows)", e.Duration); return r; }
    public override ValueTask<int> NonQueryExecutedAsync(DbCommand c, CommandExecutedEventData e, int r, CancellationToken ct = default) { Add(c, $"non-query ({r} rows)", e.Duration); return ValueTask.FromResult(r); }
    public override object? ScalarExecuted(DbCommand c, CommandExecutedEventData e, object? r) { Add(c, "scalar", e.Duration); return r; }
    public override ValueTask<object?> ScalarExecutedAsync(DbCommand c, CommandExecutedEventData e, object? r, CancellationToken ct = default) { Add(c, "scalar", e.Duration); return ValueTask.FromResult(r); }
    public override void CommandFailed(DbCommand c, CommandErrorEventData e) => Add(c, "failed", e.Duration, e.Exception.Message);
    public override Task CommandFailedAsync(DbCommand c, CommandErrorEventData e, CancellationToken ct = default) { Add(c, "failed", e.Duration, e.Exception.Message); return Task.CompletedTask; }
}
