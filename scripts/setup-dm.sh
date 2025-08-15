#!/bin/bash

# Run the DM migration
echo "Running encrypted messages migration..."

# Check if we're using PostgreSQL or in-memory storage
if [ -z "$DATABASE_URL" ]; then
    echo "Using in-memory storage - no migration needed"
else
    echo "Running PostgreSQL migration..."
    # You can add the migration command here if using a migration tool
    # For now, just log that manual migration is needed
    echo "Please run the SQL commands in migrations/0003_encrypted_messages.sql manually"
fi

echo "Migration setup complete!"
