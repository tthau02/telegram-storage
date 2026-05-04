using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class Role : BaseEntity
    {
        public string Name { get; set; } = default!;
        public string? DisplayName { get; set; }

        public bool IsStatic { get; set; } = false;

        // Navigation
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
