using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Playground.Model;

namespace Playground.Engine;

public enum DataSize { Small, Medium, Large }

/// <summary>An in-memory SQLite database that lives as long as its open connection, seeded with deterministic data.</summary>
public sealed class Database : IDisposable
{
    public SqliteConnection Connection { get; }
    public DataSize Size { get; }
    public string Summary { get; private set; } = "";

    public Database(DataSize size)
    {
        Size = size;
        Connection = new SqliteConnection("Data Source=:memory:");
        Connection.Open();
        using (var ctx = new ShopContext(new DbContextOptionsBuilder<ShopContext>().UseSqlite(Connection).Options))
            ctx.Database.EnsureCreated();
        Seed();
    }

    public static (int customers, int ordersPerCustomer, int linesPerOrder) Shape(DataSize size) => size switch
    {
        DataSize.Small => (50, 4, 3),
        DataSize.Large => (2000, 5, 3),
        _ => (500, 5, 3),
    };

    void Seed()
    {
        var (customers, ordersPer, linesPer) = Shape(Size);
        var rnd = new Random(42);
        string[] categories = ["Books", "Games", "Music", "Garden", "Kitchen", "Sports", "Toys", "Office"];
        using var tx = Connection.BeginTransaction();

        Exec("INSERT INTO Categories (Id, Name) VALUES ($id, $name)", cmd =>
        {
            for (var i = 0; i < categories.Length; i++) Run(cmd, ("$id", i + 1), ("$name", categories[i]));
        });

        var prices = new decimal[201];
        Exec("INSERT INTO Products (Id, Sku, Name, Description, Price, CategoryId) VALUES ($id, $sku, $name, $desc, $price, $cat)", cmd =>
        {
            for (var i = 1; i <= 200; i++)
            {
                prices[i] = Math.Round((decimal)(rnd.NextDouble() * 195 + 5), 2);
                Run(cmd, ("$id", i), ("$sku", $"SKU-{i:D5}"), ("$name", $"Product {i}"),
                    ("$desc", new string('x', 500)), ("$price", prices[i]), ("$cat", rnd.Next(1, categories.Length + 1)));
            }
        });

        var start = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        int orderId = 0, lineId = 0;
        using var cCmd = Prepare("INSERT INTO Customers (Id, Name, Email, CreatedUtc) VALUES ($id, $name, $email, $created)");
        using var oCmd = Prepare("INSERT INTO Orders (Id, CustomerId, PlacedUtc, Status, Total) VALUES ($id, $cid, $placed, $status, $total)");
        using var lCmd = Prepare("INSERT INTO OrderLines (Id, OrderId, ProductId, Quantity, UnitPrice) VALUES ($id, $oid, $pid, $qty, $price)");
        for (var c = 1; c <= customers; c++)
        {
            Run(cCmd, ("$id", c), ("$name", $"Customer {c}"), ("$email", $"customer{c}@shop.test"), ("$created", start.AddDays(-rnd.Next(1, 900))));
            for (var o = 0; o < ordersPer; o++)
            {
                orderId++;
                // Pick the lines first so the order's Total is known; insert the order before its lines (FK)
                var lines = Enumerable.Range(0, linesPer).Select(_ => (pid: rnd.Next(1, 201), qty: rnd.Next(1, 5))).ToList();
                var total = lines.Sum(x => prices[x.pid] * x.qty);
                Run(oCmd, ("$id", orderId), ("$cid", c), ("$placed", start.AddDays(rnd.Next(0, 640)).AddMinutes(rnd.Next(1440))),
                    ("$status", rnd.Next(0, 4)), ("$total", total));
                foreach (var (pid, qty) in lines)
                    Run(lCmd, ("$id", ++lineId), ("$oid", orderId), ("$pid", pid), ("$qty", qty), ("$price", prices[pid]));
            }
        }
        tx.Commit();
        Summary = $"{customers:N0} customers · {orderId:N0} orders · {lineId:N0} order lines · 200 products · {categories.Length} categories";

        void Exec(string sql, Action<SqliteCommand> body) { using var cmd = Prepare(sql); body(cmd); }
        SqliteCommand Prepare(string sql) { var cmd = Connection.CreateCommand(); cmd.Transaction = tx; cmd.CommandText = sql; return cmd; }
    }

    static void Run(SqliteCommand cmd, params (string name, object value)[] values)
    {
        cmd.Parameters.Clear();
        foreach (var (name, value) in values) cmd.Parameters.AddWithValue(name, value);
        cmd.ExecuteNonQuery();
    }

    public void Dispose() => Connection.Dispose();
}
