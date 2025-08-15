@echo off
echo Starting MinSoText application in production mode...

REM Build and start containers
docker-compose up --build -d

REM Wait a bit for services to start
echo Waiting for services to start...
timeout /t 10 >nul

REM Run database migrations
echo Running database migrations...
docker-compose exec app npm run db:migrate

echo.
echo Application is starting up!
echo.
echo You can access the application at: http://localhost:5000
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
