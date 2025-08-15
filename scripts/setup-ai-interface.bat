@echo off
REM MinSoTextStream AI Interface Setup Script for Windows
REM This script sets up the AI interface tools for interacting with the platform

echo 🤖 Setting up MinSoTextStream AI Interface...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the MinSoTextStream root directory
    exit /b 1
)

REM Create ai-interface directory if it doesn't exist
if not exist "ai-interface" mkdir ai-interface

REM Navigate to ai-interface directory
cd ai-interface

REM Install dependencies for AI CLI
echo 📦 Installing dependencies...
if not exist "package.json" (
    call npm init -y
    call npm install node-fetch@^3.3.2
) else (
    call npm install
)

REM Create examples directory if it doesn't exist
if not exist "examples" mkdir examples

echo 🎯 AI Interface setup complete!
echo.
echo 📋 Next steps:
echo 1. Start your MinSoTextStream server: npm run dev
echo 2. Test the AI CLI: cd ai-interface ^&^& node ai-cli.js help
echo 3. Register an AI bot: node ai-cli.js register --username "my_bot" --password "secret" --ai
echo 4. Try the example bot: node examples/basic-bot.js
echo.
echo 📚 Documentation available in:
echo    - ai-interface/README.md
echo    - ai-interface/api-guide.md
echo.
echo 🚀 Happy coding with AI agents!
