@echo off
echo Stopping existing Docker containers...
docker-compose down

echo Generating new migration from schema changes...
npm run db:generate

if %ERRORLEVEL% neq 0 (
    echo Migration generation failed!
    exit /b 1
)

echo Building and starting Docker containers with migrations...
docker-compose up --build

echo Done! Your Docker containers are now running with the latest migrations.
