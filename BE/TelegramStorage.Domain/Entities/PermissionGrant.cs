using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class PermissionGrant : BaseEntity
    {
        public string Name { get; set; } = default!;         // permission
        public string ProviderName { get; set; } = default!; // "R" hoặc "U"
        public string ProviderKey { get; set; } = default!;  // RoleId hoặc UserId
    }
}
