#!/bin/bash
echo "Generating new migration..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "Migration generation failed!"
    exit 1
fi

echo "Migration generated successfully!"
echo "To apply this migration in Docker, run: docker-compose up --build"
