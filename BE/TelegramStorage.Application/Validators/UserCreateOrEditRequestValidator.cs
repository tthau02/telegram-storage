using FluentValidation;
using TelegramStorage.Application.DTOs.Users;

namespace TelegramStorage.Application.Validators;

public sealed class UserCreateOrEditRequestValidator : AbstractValidator<UserCreateOrEditRequest>
{
    public const string CreateRuleSet = "Create";
    public const string UpdateRuleSet = "Update";

    public UserCreateOrEditRequestValidator()
    {
        RuleSet(
            CreateRuleSet,
            () =>
            {
                RuleFor(x => x.UserName).NotEmpty().MaximumLength(256);
                RuleFor(x => x.FullName).NotEmpty().MaximumLength(256);
                RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
                RuleFor(x => x.Password).NotEmpty().MinimumLength(6).MaximumLength(256);
                RuleFor(x => x.PhoneNumber).MaximumLength(32);
                RuleFor(x => x.Avatar).MaximumLength(2000);
            });

        RuleSet(
            UpdateRuleSet,
            () =>
            {
                When(x => x.FullName is not null, () => RuleFor(x => x.FullName!).NotEmpty().MaximumLength(256));
                When(x => x.Email is not null, () => RuleFor(x => x.Email!).NotEmpty().EmailAddress().MaximumLength(256));
                When(x => x.PhoneNumber is not null, () => RuleFor(x => x.PhoneNumber!).MaximumLength(32));
                When(x => x.Avatar is not null, () => RuleFor(x => x.Avatar!).MaximumLength(2000));
                When(
                    x => !string.IsNullOrEmpty(x.Password),
                    () => RuleFor(x => x.Password!).MinimumLength(6).MaximumLength(256));
            });
    }
}
