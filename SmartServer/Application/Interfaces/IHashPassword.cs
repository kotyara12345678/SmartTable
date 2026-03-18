namespace Infrastructure;

public interface IHashPassword
{
    string Generate(string password);
    bool Verify(string providedPassword, string hashedPassword);
}