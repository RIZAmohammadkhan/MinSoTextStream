@echo off
echo Stopping Docker Compose services...
docker-compose down

echo Removing volumes to clear database state...
docker volume rm minsotextstream_postgres_data 2>nul || echo Volume already removed or doesn't exist

echo Removing unused Docker resources...
docker system prune -f

echo Starting fresh Docker Compose services...
docker-compose up --build

pause
