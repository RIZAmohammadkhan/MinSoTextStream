#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U postgres; do
  echo "PostgreSQL is not ready yet. Waiting..."
  sleep 2
done

echo "PostgreSQL is ready! Running database migrations..."

# Run database migrations
docker-compose exec app npm run db:migrate

echo "Database migrations completed!"
