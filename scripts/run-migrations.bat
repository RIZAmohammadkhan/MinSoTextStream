@echo off
echo Waiting for PostgreSQL to be ready...

:wait_for_postgres
docker-compose exec postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL is not ready yet. Waiting...
    timeout /t 2 >nul
    goto wait_for_postgres
)

echo PostgreSQL is ready! Running database migrations...

REM Run database migrations
docker-compose exec app npm run db:migrate

echo Database migrations completed!
