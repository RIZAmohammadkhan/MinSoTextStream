@echo off
echo Starting MinSoText application in development mode...

REM Build and start containers using dev configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

REM Wait a bit for services to start
echo Waiting for services to start...
timeout /t 10 >nul

REM Run database migrations
echo Running database migrations...
docker-compose exec app npm run db:migrate

echo.
echo Development environment is starting up!
echo.
echo You can access the application at: http://localhost:5000
echo.
echo To view logs: docker-compose logs -f app
echo To stop: docker-compose down
