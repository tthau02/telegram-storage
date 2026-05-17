---
name: simple-web-backend
description: >-
  Implements ASP.NET Core 8 APIs for TelegramStorage — layered architecture,
  BaseController, AppServiceBase, FluentValidation, EF Core, JWT. Use when
  editing BE/, C# controllers, services, validators, Domain entities, or
  Infrastructure.
---

# Simple Web — Backend (.NET)

## Layer rules

| Layer | Chứa | Không chứa |
|-------|------|------------|
| `TelegramStorage` | Controllers, Middleware, Program.cs | Business logic, DbContext trực tiếp |
| `Application` | DTOs, `I*Service`, Validators, Options, Mappings | EF, Telegram client |
| `Domain` | Entities kế thừa `BaseEntity` | DTO, HTTP |
| `Infrastructure` | DbContext, Services, Repositories, Migrations | Controller |

## Controller template

```csharp
[Authorize]
public sealed class ExampleController : BaseController
{
    private readonly IExampleService _service;
    public ExampleController(IExampleService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ExampleDto>>>> List(CancellationToken ct)
    {
        if (CurrentUserId is null)
            return BadRequest(ApiResponse.Fail("Không xác định được người dùng.", 400));
        var data = await _service.ListAsync(CurrentUserId.Value, ct);
        return OkResponse(data);
    }
}
```

- Route mặc định: `v1/api/[controller]` (từ `BaseController`).
- Dùng `OkResponse`, `NotFoundResponse`, `FailResponse` — không tự serialize JSON.

## Service patterns

**Ưu tiên** `AppServiceBase` + `IUnitOfWork` cho CRUD generic:

```csharp
public sealed class XxxService : AppServiceBase, IXxxService
{
    public XxxService(IUnitOfWork uow) : base(uow) { }
    // Repo<T>(), Q<T>() ...
}
```

**FolderService** dùng `TelegramStorageDbContext` trực tiếp — chấp nhận khi query phức tạp (Include tree).

- Lỗi không tìm thấy: `throw new KeyNotFoundException("...")` → middleware → 404.
- Lỗi nghiệp vụ: `InvalidOperationException` → 400.

## Validator

```csharp
public sealed class CreateXxxValidator : AbstractValidator<CreateXxxRequest>
{
    public CreateXxxValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}
```

Đặt trong `Application/Validators/`. FluentValidation auto-validation đã bật trong `Program.cs`.

## DI registration

Thêm vào `Infrastructure/DependencyInjection.cs`:

```csharp
services.AddScoped<IXxxService, XxxService>();
```

Singleton cho Telegram executor/gateway; Scoped cho DB-bound services.

## Entity conventions

- `BaseEntity`: `Id`, audit fields, `IsDeleted` (soft delete).
- JSON API: **camelCase** (`PropertyNamingPolicy.CamelCase`).

## Không làm

- Logic trong controller
- Reference Infrastructure từ Application
- Commit `telegram.session` hoặc secrets trong appsettings

## Tham chiếu

- `BE/TelegramStorage/Controllers/FoldersController.cs`
- `BE/TelegramStorage.Infrastructure/Services/FolderService.cs`
- `BE/TelegramStorage/Middleware/ExceptionHandlingMiddleware.cs`
