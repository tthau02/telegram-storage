using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TelegramStorage.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddthumbnailId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ThumbnailFileId",
                table: "Files",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Files_ThumbnailFileId",
                table: "Files",
                column: "ThumbnailFileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Files_ThumbnailFileId",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "ThumbnailFileId",
                table: "Files");
        }
    }
}
