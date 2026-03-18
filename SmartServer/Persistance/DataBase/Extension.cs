using Aplication;
using Microsoft.EntityFrameworkCore;
using Persistance;

namespace Presentation;

public static class Extension
{
    public static IServiceCollection AddPersistance(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddDbContext<AuthDbContext>(x =>
        {
            x.UseNpgsql(configuration.GetConnectionString("AuthDb"));
        });
        return services;
    }
}