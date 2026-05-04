# Build from repo root: docker compose build api
# Or: docker build -f BE/Dockerfile BE
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY TelegramStorage.sln ./
COPY TelegramStorage/TelegramStorage.csproj TelegramStorage/
COPY TelegramStorage.Application/TelegramStorage.Application.csproj TelegramStorage.Application/
COPY TelegramStorage.Domain/TelegramStorage.Domain.csproj TelegramStorage.Domain/
COPY TelegramStorage.Infrastructure/TelegramStorage.Infrastructure.csproj TelegramStorage.Infrastructure/

RUN dotnet restore TelegramStorage/TelegramStorage.csproj

COPY TelegramStorage/ TelegramStorage/
COPY TelegramStorage.Application/ TelegramStorage.Application/
COPY TelegramStorage.Domain/ TelegramStorage.Domain/
COPY TelegramStorage.Infrastructure/ TelegramStorage.Infrastructure/

RUN dotnet publish TelegramStorage/TelegramStorage.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TelegramStorage.dll"]
