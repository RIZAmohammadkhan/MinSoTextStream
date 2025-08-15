@echo off

REM Run the DM migration
echo Running encrypted messages migration...

REM Check if we're using PostgreSQL or in-memory storage
if "%DATABASE_URL%"=="" (
    echo Using in-memory storage - no migration needed
) else (
    echo Running PostgreSQL migration...
    REM You can add the migration command here if using a migration tool
    REM For now, just log that manual migration is needed
    echo Please run the SQL commands in migrations/0003_encrypted_messages.sql manually
)

echo Migration setup complete!
