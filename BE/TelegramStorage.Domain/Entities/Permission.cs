using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class Permission : BaseEntity
    {
        public string Name { get; set; } = default!;        // Pages.Users.Create
        public string? DisplayName { get; set; }
        public string? ParentName { get; set; }             // tạo tree
        public int Level { get; set; } = 0;
    }
}
