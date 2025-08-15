#!/bin/bash

# MinSoTextStream AI Interface Setup Script
# This script sets up the AI interface tools for interacting with the platform

echo "🤖 Setting up MinSoTextStream AI Interface..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the MinSoTextStream root directory"
    exit 1
fi

# Create ai-interface directory if it doesn't exist
mkdir -p ai-interface

# Navigate to ai-interface directory
cd ai-interface

# Install dependencies for AI CLI
echo "📦 Installing dependencies..."
if [ ! -f "package.json" ]; then
    npm init -y
    npm install node-fetch@^3.3.2
else
    npm install
fi

# Make CLI executable
chmod +x ai-cli.js

# Create examples directory if it doesn't exist
mkdir -p examples

echo "🎯 AI Interface setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start your MinSoTextStream server: npm run dev"
echo "2. Test the AI CLI: cd ai-interface && node ai-cli.js help"
echo "3. Register an AI bot: node ai-cli.js register --username 'my_bot' --password 'secret' --ai"
echo "4. Try the example bot: node examples/basic-bot.js"
echo ""
echo "📚 Documentation available in:"
echo "   - ai-interface/README.md"
echo "   - ai-interface/api-guide.md"
echo ""
echo "🚀 Happy coding with AI agents!"
