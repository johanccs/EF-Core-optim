using System.Collections;
using System.Globalization;
using System.Reflection;

namespace Playground.Engine;

public enum OutputItemKind { Text, Table, Warning, Error }

public sealed class OutputItem
{
    public OutputItemKind Kind { get; init; }
    public string? Title { get; init; }
    public string Text { get; set; } = "";
    public List<string> Columns { get; init; } = new();
    public List<List<string>> Rows { get; init; } = new();
    public int TotalRows { get; init; }
}

/// <summary>Collects what a run prints. Console output is appended as text items.</summary>
public sealed class OutputSink : TextWriter
{
    public const int MaxRows = 200;
    public static OutputSink? Current { get; set; }
    public List<OutputItem> Items { get; } = new();
    public override System.Text.Encoding Encoding => System.Text.Encoding.UTF8;

    OutputItem TextItem()
    {
        if (Items.Count == 0 || Items[^1].Kind != OutputItemKind.Text) Items.Add(new OutputItem { Kind = OutputItemKind.Text });
        return Items[^1];
    }
    public override void Write(char value) => TextItem().Text += value;
    public override void Write(string? value) => TextItem().Text += value;
    public void Add(OutputItem item) => Items.Add(item);

    public void Dump(object? value, string? title)
    {
        if (value is null || value is string || value.GetType().IsPrimitive || value is decimal or DateTime or Guid or Enum)
        {
            Items.Add(new OutputItem { Kind = OutputItemKind.Text, Title = title, Text = Cell(value) });
            return;
        }
        var list = value is IEnumerable e ? e.Cast<object?>().ToList() : [value];
        var type = ElementType(value, list);
        var props = type?.GetProperties(BindingFlags.Public | BindingFlags.Instance).Where(p => p.GetIndexParameters().Length == 0).ToList() ?? [];
        var item = new OutputItem { Kind = OutputItemKind.Table, Title = title, TotalRows = list.Count };
        if (props.Count == 0) item.Columns.Add("Value"); else item.Columns.AddRange(props.Select(p => p.Name));
        foreach (var row in list.Take(MaxRows))
            item.Rows.Add(props.Count == 0 ? [Cell(row)] : props.Select(p => Cell(SafeGet(p, row))).ToList());
        Items.Add(item);
    }

    static Type? ElementType(object value, List<object?> list)
    {
        var t = value.GetType();
        var gen = t.GetInterfaces().Concat([t]).FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEnumerable<>));
        if (value is IEnumerable && gen != null) return gen.GetGenericArguments()[0];
        return list.FirstOrDefault()?.GetType() ?? t;
    }

    static object? SafeGet(PropertyInfo p, object? o) { try { return o is null ? null : p.GetValue(o); } catch (Exception ex) { return "⚠ " + (ex.InnerException ?? ex).GetType().Name; } }

    static string Cell(object? v) => v switch
    {
        null => "null",
        string s => s.Length > 80 ? s[..77] + "…" : s,
        DateTime d => d.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        decimal m => m.ToString("0.00", CultureInfo.InvariantCulture),
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        ICollection c => $"({c.Count} items)",
        IEnumerable => "(sequence)",
        _ => v.GetType().Namespace == "Playground.Model" ? $"{{{v.GetType().Name}}}" : v.ToString() ?? "",
    };
}

/// <summary>Helpers available to playground code (imported with <c>using static</c>).</summary>
public static class PlaygroundExtensions
{
    /// <summary>Shows a value or a sequence as a table in the Output tab and returns it unchanged.</summary>
    public static T Dump<T>(this T value, string? title = null)
    {
        OutputSink.Current?.Dump(value, title);
        return value;
    }
}
