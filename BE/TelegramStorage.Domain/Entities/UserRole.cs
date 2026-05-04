using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class UserRole : BaseEntity
    {
        public long UserId { get; set; }
        public long RoleId { get; set; }
        // Navigation
        public User User { get; set; } = default!;
        public Role Role { get; set; } = default!;
    }
}
