namespace Infrastructure;

public class HashPassword : IHashPassword
{
    public string Generate(string password)
    {
        return BCrypt.Net.BCrypt.EnhancedHashPassword(password);
    }

    public bool Verify(string providedPassword, string hashedPassword)
    {
        return BCrypt.Net.BCrypt.EnhancedVerify(providedPassword, hashedPassword);
    }
}
