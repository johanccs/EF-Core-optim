namespace Playground.Engine;

public sealed record Example(string Id, string Title, int Lesson, string LessonSlug, string Description, string Code);

/// <summary>Runnable examples. Each maps to a lesson; the SQL tab shows what EF Core really sent.</summary>
public static class Examples
{
    public static readonly Example[] All =
    [
        new("first-query", "Your first query", 4, "04-querying-fundamentals",
            "Build a query, print its SQL with ToQueryString(), then run it.",
            """
            var query = db.Orders
                .Where(o => o.Status == OrderStatus.Paid)
                .OrderByDescending(o => o.PlacedUtc)
                .Take(5);

            Console.WriteLine(query.ToQueryString());   // the SQL, without running it

            var orders = await query.ToListAsync();     // runs it: one round trip
            orders.Dump("5 most recent paid orders");
            """),

        new("n-plus-one", "N+1 vs one query", 12, "12-loading-related-data",
            "Load 20 orders and their customer names, first the slow way, then with a projection. Compare the SQL tab.",
            """
            // ❌ N+1: one query for the orders + one query per order for its customer
            var orders = await db.Orders.OrderBy(o => o.Id).Take(20).ToListAsync();
            foreach (var o in orders)
            {
                var customer = await db.Customers.FirstAsync(c => c.Id == o.CustomerId);
            }
            Console.WriteLine("N+1 version: 1 + 20 = 21 commands");

            // ✅ One query: the projection becomes a JOIN
            var rows = await db.Orders.OrderBy(o => o.Id).Take(20)
                .Select(o => new { o.Id, Customer = o.Customer.Name, o.Total })
                .ToListAsync();
            rows.Dump("Projection: 1 command");
            """),

        new("projection", "Projection vs full entities", 11, "11-projections",
            "Compare the columns fetched by a full-entity query and a projection.",
            """
            var full = db.Products.Where(p => p.CategoryId == 1);
            var lean = db.Products.Where(p => p.CategoryId == 1)
                                  .Select(p => new { p.Id, p.Name, p.Price });

            Console.WriteLine("Full entities (every column, incl. the 500-char Description):");
            Console.WriteLine(full.ToQueryString());
            Console.WriteLine();
            Console.WriteLine("Projection (only 3 columns, not tracked):");
            Console.WriteLine(lean.ToQueryString());

            (await lean.OrderBy(p => p.Id).Take(10).ToListAsync()).Dump("Projection result");
            """),

        new("tracking", "Tracking vs no-tracking", 10, "10-tracking-vs-no-tracking",
            "Load the same rows with and without change tracking and compare tracked entities and time.",
            """
            var sw = Stopwatch.StartNew();
            var tracked = await db.Orders.OrderBy(o => o.Id).Take(2000).ToListAsync();
            Console.WriteLine($"Tracking query:  {sw.ElapsedMilliseconds,5} ms, tracked entities = {db.ChangeTracker.Entries().Count()}");

            db.ChangeTracker.Clear();
            sw.Restart();
            var untracked = await db.Orders.AsNoTracking().OrderBy(o => o.Id).Take(2000).ToListAsync();
            Console.WriteLine($"AsNoTracking:    {sw.ElapsedMilliseconds,5} ms, tracked entities = {db.ChangeTracker.Entries().Count()}");
            """),

        new("split-query", "Include and split queries", 15, "15-split-queries",
            "Load customers with orders and order lines as one query (note EF Core's warning), then as a split query. Compare the commands.",
            """
            var single = await db.Customers
                .OrderBy(c => c.Id).Take(5)
                .Include(c => c.Orders).ThenInclude(o => o.Lines)
                .ToListAsync();
            Console.WriteLine($"Single query: {single.Sum(c => c.Orders.Count)} orders loaded with one JOINed command");

            db.ChangeTracker.Clear();
            var split = await db.Customers
                .OrderBy(c => c.Id).Take(5)
                .Include(c => c.Orders).ThenInclude(o => o.Lines)
                .AsSplitQuery()
                .ToListAsync();
            Console.WriteLine("Split query: one command per collection level (see the SQL tab)");
            """),

        new("pagination", "Offset vs keyset paging", 13, "13-pagination",
            "Fetch the same page with Skip/Take and with a keyset (seek) predicate.",
            """
            const int pageSize = 10, page = 50;

            var offset = await db.Orders.OrderBy(o => o.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(o => new { o.Id, o.PlacedUtc, o.Total })
                .ToListAsync();
            offset.Dump($"Offset: page {page} (the database reads and discards {(page - 1) * pageSize} rows first)");

            var lastIdOfPreviousPage = offset[0].Id - 1;      // in an API this comes from the client's cursor
            var keyset = await db.Orders
                .Where(o => o.Id > lastIdOfPreviousPage)
                .OrderBy(o => o.Id).Take(pageSize)
                .Select(o => new { o.Id, o.PlacedUtc, o.Total })
                .ToListAsync();
            keyset.Dump("Keyset: the same rows, found by seeking on the primary key");
            """),

        new("bulk-update", "ExecuteUpdate and ExecuteDelete", 16, "16-efficient-saving",
            "Change and delete many rows with one statement each, without loading them.",
            """
            var updated = await db.OrderLines
                .Where(l => l.Quantity == 1)
                .ExecuteUpdateAsync(s => s.SetProperty(l => l.Quantity, l => l.Quantity + 1));
            Console.WriteLine($"{updated} order lines updated by ONE UPDATE statement");

            var deleted = await db.Orders
                .Where(o => o.Status == OrderStatus.Cancelled && o.Lines.Count == 0)
                .ExecuteDeleteAsync();
            Console.WriteLine($"{deleted} empty cancelled orders deleted by ONE DELETE statement");

            Console.WriteLine($"Tracked entities: {db.ChangeTracker.Entries().Count()} (nothing was loaded)");
            """),

        new("batching", "SaveChanges per row vs once", 16, "16-efficient-saving",
            "Insert 20 rows with a SaveChanges per row, then 20 rows with one SaveChanges. Note: the SQLite provider sends one command per row either way (SQL Server would batch them into very few round trips), but a single SaveChanges is still one unit of work and one transaction.",
            """
            var sw = Stopwatch.StartNew();
            for (var i = 0; i < 20; i++)
            {
                db.Categories.Add(new Category { Name = $"Loop {i}" });
                await db.SaveChangesAsync();                 // ❌ a round trip per row
            }
            Console.WriteLine($"SaveChanges in a loop: {sw.ElapsedMilliseconds} ms");

            sw.Restart();
            for (var i = 0; i < 20; i++) db.Categories.Add(new Category { Name = $"Batch {i}" });
            await db.SaveChangesAsync();                     // ✅ one SaveChanges for all rows
            Console.WriteLine($"One SaveChanges:       {sw.ElapsedMilliseconds} ms");
            Console.WriteLine();
            Console.WriteLine("SQLite runs in-process, so EF Core's SQLite provider doesn't batch: the SQL tab shows");
            Console.WriteLine("one INSERT per row in both cases. On SQL Server, the single SaveChanges would be sent as");
            Console.WriteLine("one or a few batched round trips, while the loop always costs 20 round trips and 20 transactions.");
            """),

        new("compiled-query", "Compiled queries", 21, "21-query-caching-and-compiled-queries",
            "Run the same lookup 300 times as a normal query and as a compiled query.",
            """
            var byId = EF.CompileAsyncQuery((ShopContext ctx, int id) =>
                ctx.Products.AsNoTracking().FirstOrDefault(p => p.Id == id));

            var sw = Stopwatch.StartNew();
            for (var i = 1; i <= 300; i++)
                await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == (i % 200) + 1);
            Console.WriteLine($"Normal query x300:   {sw.ElapsedMilliseconds} ms");

            sw.Restart();
            for (var i = 1; i <= 300; i++)
                await byId(db, (i % 200) + 1);
            Console.WriteLine($"Compiled query x300: {sw.ElapsedMilliseconds} ms");
            Console.WriteLine("Both send identical SQL; the compiled version skips the query-cache lookup.");
            """),

        new("raw-sql", "Raw SQL safely", 18, "18-raw-sql-and-views",
            "Use FromSql and SqlQuery with interpolated values that become parameters.",
            """
            var categoryId = 3;
            var products = await db.Products
                .FromSql($"SELECT * FROM Products WHERE CategoryId = {categoryId}")   // {categoryId} becomes a parameter
                .OrderBy(p => p.Name)                                                // LINQ composes on top
                .Take(5)
                .Select(p => new { p.Id, p.Name, p.Price })
                .ToListAsync();
            products.Dump("FromSql + LINQ");

            var paid = await db.Database
                .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM Orders WHERE Status = {(int)OrderStatus.Paid}")
                .SingleAsync();
            Console.WriteLine($"Paid orders (SqlQuery<int>): {paid}");
            """),

        new("client-eval", "Untranslatable filters", 4, "04-querying-fundamentals",
            "See EF Core refuse to run a filter it can't translate, and the translatable fix.",
            """
            // A compiled .NET delegate: EF Core can't see inside it, so it can't turn it into SQL
            Func<Customer, bool> isVip = c => c.Email.EndsWith("7@shop.test");
            try
            {
                var vips = await db.Customers.Where(c => isVip(c)).ToListAsync();
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine("EF Core refused to download every row and filter in memory:\n");
                Console.WriteLine(ex.Message);
            }

            var fixedQuery = await db.Customers.Where(c => c.Email.EndsWith("7@shop.test")).OrderBy(c => c.Id).Take(5).ToListAsync();
            fixedQuery.Dump("Translatable version: the condition is written inline, so it becomes a WHERE clause");
            """),

        new("transaction", "Transactions and rollback", 17, "17-concurrency-and-transactions",
            "Make changes inside a transaction, then roll them back.",
            """
            var before = await db.Categories.CountAsync();

            await using (var tx = await db.Database.BeginTransactionAsync())
            {
                db.Categories.Add(new Category { Name = "Temporary" });
                await db.SaveChangesAsync();
                Console.WriteLine($"Inside the transaction: {await db.Categories.CountAsync()} categories");
                await tx.RollbackAsync();
            }

            db.ChangeTracker.Clear();
            Console.WriteLine($"After rollback:        {await db.Categories.CountAsync()} categories (was {before})");
            """),

        new("blank", "Blank: write your own", 0, "",
            "An empty program. `db` is a ShopContext; use .Dump() to show results as a table.",
            """
            // `db` is a ShopContext connected to the in-browser SQLite database.
            // Entities: Customers, Orders, OrderLines, Products, Categories (see the Model tab).

            var top = await db.Customers
                .Select(c => new { c.Name, Orders = c.Orders.Count, Spent = c.Orders.Sum(o => o.Total) })
                .OrderByDescending(x => x.Orders)
                .Take(10)
                .ToListAsync();

            top.Dump("Customers with the most orders");
            """),
    ];
}
