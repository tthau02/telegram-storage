using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class User : BaseEntity
    {
        public string UserName { get; set; } = default!;
        public string FullName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PasswordHash { get; set; } = default!;
        public string? PhoneNumber { get; set; }
        public string? Avatar { get; set; }
        public bool Status { get; set; } = true;

        // Navigation
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    }
}
