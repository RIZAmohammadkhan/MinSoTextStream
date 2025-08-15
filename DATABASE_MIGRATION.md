# Environment Configuration

## Database Migration

This project supports both in-memory storage (for development/testing) and PostgreSQL (for production).

### Development (In-Memory Storage)
No setup required. The application will automatically use in-memory storage when `DATABASE_URL` is not set.

### Production (PostgreSQL)

1. **Set up PostgreSQL database**
   ```bash
   # Example with local PostgreSQL
   export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   
   # Example with Neon (recommended)
   export DATABASE_URL="postgresql://username:password@host.neon.tech/database_name?sslmode=require"
   ```

2. **Push database schema**
   ```bash
   npm run db:push
   ```

3. **Run the application**
   ```bash
   npm run dev
   ```

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (optional)
  - If set: Uses PostgreSQL storage
  - If not set: Uses in-memory storage

### Migrating Data

When switching from in-memory to PostgreSQL, you'll start with a fresh database. To migrate existing data, you would need to:

1. Export data from the current storage
2. Set up PostgreSQL
3. Import data to PostgreSQL

For production deployment, always use PostgreSQL with a proper `DATABASE_URL`.

### Example .env file

```env
# For local development (optional)
DATABASE_URL=postgresql://localhost:5432/minsotext

# For production
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Testing the Migration

1. **Test in-memory storage:**
   ```bash
   # Remove DATABASE_URL if set
   unset DATABASE_URL
   npm run dev
   ```

2. **Test PostgreSQL storage:**
   ```bash
   export DATABASE_URL="your_postgresql_connection_string"
   npm run db:push
   npm run dev
   ```
