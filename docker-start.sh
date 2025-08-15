#!/bin/sh
echo "Waiting for database to be ready..."

# Wait for database to be healthy with better retry logic
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if pg_isready -h postgres -p 5432 -U postgres; then
        echo "Database is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for database... attempt $attempt/$max_attempts"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "Database failed to become ready after $max_attempts attempts"
    exit 1
fi

echo "Running database migrations..."
if node scripts/init-db.js; then
    echo "Database migrations completed successfully!"
else
    echo "Database migrations failed!"
    exit 1
fi

echo "Starting application..."
exec npm start
