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

| Layer | Contains | Must not contain |
|-------|----------|------------------|
| `TelegramStorage` | Controllers, Middleware, Program.cs | Business logic, direct DbContext |
| `Application` | DTOs, `I*Service`, Validators, Options, Mappings | EF, Telegram client |
| `Domain` | Entities extending `BaseEntity` | DTOs, HTTP |
| `Infrastructure` | DbContext, Services, Repositories, Migrations | Controllers |

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

- Default route: `v1/api/[controller]` (from `BaseController`).
- Use `OkResponse`, `NotFoundResponse`, `FailResponse` — do not hand-serialize JSON.
- User-facing API messages in this codebase are **Vietnamese** — match existing strings.

## Service patterns

**Prefer** `AppServiceBase` + `IUnitOfWork` for generic CRUD:

```csharp
public sealed class XxxService : AppServiceBase, IXxxService
{
    public XxxService(IUnitOfWork uow) : base(uow) { }
    // Repo<T>(), Q<T>() ...
}
```

**FolderService** uses `TelegramStorageDbContext` directly — acceptable for complex queries (e.g. Include tree).

- Not found: `throw new KeyNotFoundException("...")` → middleware → 404.
- Business rule violation: `InvalidOperationException` → 400.

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

Place under `Application/Validators/`. FluentValidation auto-validation is enabled in `Program.cs`.

## DI registration

Add to `Infrastructure/DependencyInjection.cs`:

```csharp
services.AddScoped<IXxxService, XxxService>();
```

Singleton for Telegram executor/gateway; Scoped for DB-bound services.

## Entity conventions

- `BaseEntity`: `Id`, audit fields, `IsDeleted` (soft delete).
- JSON API: **camelCase** (`PropertyNamingPolicy.CamelCase`).

## Do not

- Put logic in controllers
- Reference Infrastructure from Application
- Commit `telegram.session` or secrets in appsettings

## References

- `BE/TelegramStorage/Controllers/FoldersController.cs`
- `BE/TelegramStorage.Infrastructure/Services/FolderService.cs`
- `BE/TelegramStorage/Middleware/ExceptionHandlingMiddleware.cs`
