#!/bin/sh
echo "Waiting for database to be ready..."
sleep 15

echo "Running database migrations..."
if node scripts/init-db.js; then
    echo "Database migrations completed successfully!"
else
    echo "Database migrations failed!"
    exit 1
fi

echo "Starting application..."
exec npm start
