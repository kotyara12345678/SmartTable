using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Persistance;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasKey(u => u.Id);
        modelBuilder.Entity<User>().Property(u => u.Username).IsRequired().HasMaxLength(20);
        modelBuilder.Entity<User>().Property(u => u.Password).IsRequired().HasMaxLength(100);
        modelBuilder.Entity<User>().Property(u => u.Email).IsRequired().HasMaxLength(25);

        base.OnModelCreating(modelBuilder);
    }
}
