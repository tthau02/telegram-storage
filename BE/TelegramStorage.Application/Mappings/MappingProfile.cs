using AutoMapper;
using TelegramStorage.Application.DTOs.Users;
using TelegramStorage.Domain.Entities;

namespace TelegramStorage.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserDto>()
            .ForMember(d => d.Roles, o => o.Ignore());

        CreateMap<RegisterRequest, User>()
            .ForMember(d => d.Id, o => o.Ignore())
            .ForMember(d => d.PasswordHash, o => o.Ignore())
            .ForMember(d => d.Avatar, o => o.Ignore())
            .ForMember(d => d.Status, o => o.MapFrom(_ => true))
            .ForMember(d => d.UserRoles, o => o.Ignore())
            .ForMember(d => d.IsDeleted, o => o.MapFrom(_ => false))
            .ForMember(d => d.CreatedAt, o => o.Ignore())
            .ForMember(d => d.CreatedBy, o => o.Ignore())
            .ForMember(d => d.UpdatedAt, o => o.Ignore())
            .ForMember(d => d.UpdatedBy, o => o.Ignore());

        CreateMap<UserCreateOrEditRequest, User>()
            .ForMember(d => d.Id, o => o.Ignore())
            .ForMember(d => d.PasswordHash, o => o.Ignore())
            .ForMember(d => d.UserRoles, o => o.Ignore())
            .ForMember(d => d.IsDeleted, o => o.MapFrom(_ => false))
            .ForMember(d => d.Status, o => o.MapFrom(s => s.Status ?? true))
            .ForMember(d => d.CreatedAt, o => o.Ignore())
            .ForMember(d => d.CreatedBy, o => o.Ignore())
            .ForMember(d => d.UpdatedAt, o => o.Ignore())
            .ForMember(d => d.UpdatedBy, o => o.Ignore());
    }
}
