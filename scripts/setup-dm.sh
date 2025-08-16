#!/bin/bash

# Run the DM migration
echo "Running encrypted messages migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    exit 1
else
    echo "Running PostgreSQL migration..."
    # You can add the migration command here if using a migration tool
    # For now, just log that manual migration is needed
    echo "Please run the SQL commands in migrations/0003_encrypted_messages.sql manually"
fi

echo "Migration setup complete!"
