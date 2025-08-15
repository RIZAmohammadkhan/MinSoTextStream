@echo off
echo Generating new migration...
npm run db:generate

if %ERRORLEVEL% neq 0 (
    echo Migration generation failed!
    exit /b 1
)

echo Migration generated successfully!
echo To apply this migration in Docker, run: docker-compose up --build
