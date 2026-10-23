using Microsoft.EntityFrameworkCore;

namespace Playground.Model;

// The same online-shop model used throughout the course (Lesson 1).
public class Customer
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public DateTime CreatedUtc { get; set; }
    public List<Order> Orders { get; set; } = new();
}

public class Order
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public DateTime PlacedUtc { get; set; }
    public OrderStatus Status { get; set; }
    public decimal Total { get; set; }
    public List<OrderLine> Lines { get; set; } = new();
}

public class OrderLine
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class Product
{
    public int Id { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public List<Product> Products { get; set; } = new();
}

public enum OrderStatus { Pending, Paid, Shipped, Cancelled }

public class ShopContext(DbContextOptions<ShopContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Customer>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(100);
            e.Property(c => c.Email).HasMaxLength(200);
            e.HasIndex(c => c.Email).IsUnique();
        });
        b.Entity<Order>(e =>
        {
            e.HasIndex(o => new { o.CustomerId, o.PlacedUtc });
            e.HasMany(o => o.Lines).WithOne().HasForeignKey(l => l.OrderId);
        });
        b.Entity<Product>(e =>
        {
            e.Property(p => p.Sku).HasMaxLength(32);
            e.HasIndex(p => p.Sku).IsUnique();
        });
    }
}
