using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TelegramStorage.Domain.Entities
{
    public class SharedLink : BaseEntity
    {
        public string Token { get; set; } = string.Empty;  // GUID unique
        public long CloudFileId { get; set; }
        public long CreatedByUserId { get; set; }
        public DateTime? ExpiresAt { get; set; }            // null = vĩnh viễn
        public string? PasswordHash { get; set; }           // null = public
        public int DownloadCount { get; set; } = 0;
        public int? MaxDownloads { get; set; }              // null = unlimited
        public bool IsActive { get; set; } = true;

        // Navigation
        public CloudFile CloudFile { get; set; } = null!;
        public User Creator { get; set; } = null!;
    }
}
