namespace Domain.Models;

public class RequestUser
{
    public RequestUser(int id, string username, string password, string email)
    {
        Username = username;
        Password = password;
        Email = email;
    }

    public RequestUser() { }
    
    public int Id { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
    public string Email { get; set; }
}