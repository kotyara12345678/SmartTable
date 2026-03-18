using Aplication;
using Domain.Models;
using Infrastructure;
using Microsoft.EntityFrameworkCore;
using Persistance;

namespace Presentation;

internal class UserRepository(AuthDbContext context, IHashPassword hash) : IUserRepository
{
    public async Task CreateUserAsync(User user, CancellationToken token = default)
    {
        var result = await context.Users.FirstOrDefaultAsync(u => u.Username == user.Username && u.Email == user.Email, token);
        if (result != null)
        {
            throw new Exception("User is already registered");
        }

        await context.Users.AddAsync(user, token);
        await context.SaveChangesAsync(token);
    }

    public async Task<User> AuthenticationUserAsync(User user, CancellationToken token)
    {
        var userFromDb = await context.Users.FirstOrDefaultAsync(u => u.Username == user.Username, token);

        if (userFromDb == null)
        {
            throw new KeyNotFoundException("User not found");
        }
        
        hash.Verify(user.Password, userFromDb.Password);

        var dbUser = new User
        {
            Username = userFromDb.Username,
            Email = userFromDb.Email,
        };
        
        return dbUser;
    }
}