using Domain.Models;

namespace Aplication;

public interface IUserRepository
{
    Task CreateUserAsync(User user, CancellationToken token);
    
    Task<User> AuthenticationUserAsync(User user, CancellationToken token);
}