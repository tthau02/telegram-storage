using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class Folder : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public long OwnerId { get; set; }
        public long? ParentId { get; set; }             // null = root
        public bool IsTrashed { get; set; } = false;
        public DateTime? TrashedAt { get; set; }
        public bool IsStarred { get; set; } = false;

        // Navigation
        public User Owner { get; set; } = null!;
        public Folder? Parent { get; set; }
        public ICollection<Folder> Children { get; set; } = new List<Folder>();
        public ICollection<CloudFile> Files { get; set; } = new List<CloudFile>();
    }
}
