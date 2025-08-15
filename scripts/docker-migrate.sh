#!/bin/bash
echo "Stopping existing Docker containers..."
docker-compose down

echo "Generating new migration from schema changes..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "Migration generation failed!"
    exit 1
fi

echo "Building and starting Docker containers with migrations..."
docker-compose up --build

echo "Done! Your Docker containers are now running with the latest migrations."
