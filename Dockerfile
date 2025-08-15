FROM node:22

# Install PostgreSQL client for pg_isready
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only package.json (no package-lock.json)
COPY package.json ./

# Install dependencies (will generate new package-lock.json)
RUN npm install

# Copy source code (excluding node_modules and .env)
COPY . .

# Ensure migrations directory is copied
COPY migrations/ ./migrations/

# Copy .env.docker and rename it to .env
COPY .env.docker .env

# Build the application
RUN npm run build

# Make startup script executable
RUN chmod +x docker-start.sh

# Expose port
EXPOSE 5000

# Start the application using the startup script
CMD ["./docker-start.sh"]