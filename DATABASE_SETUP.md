# Database Setup & Persistence Guide

## Current Setup

The application uses SQLite with the database file located at:
```
server/prisma/dev.db
```

## Important: Database Persistence

**Your database IS persisting correctly!** The `dev.db` file exists and data is saved between server restarts.

### How to Check Your Database

1. **Check if the database file exists:**
   ```bash
   ls -la server/prisma/dev.db
   ```

2. **View your registered companies:**
   ```bash
   cd server
   npx prisma studio
   ```
   This opens a web interface at http://localhost:5555 to browse your data.

## Common Misunderstanding

If you're seeing "no company data" after server restart, it's likely because:

1. **You're running the seed script manually** - This DELETES all data and creates sample data
   ```bash
   # DON'T run this unless you want to reset the database:
   npm run prisma:seed
   ```

2. **The database was actually reset** - Check if someone ran:
   ```bash
   # These commands will wipe your data:
   npx prisma migrate reset
   npx prisma db push --force-reset
   ```

## Correct Workflow

### First Time Setup
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed  # Only run ONCE to create sample data
npm run dev
```

### Normal Development (Server Already Set Up)
```bash
cd server
npm run dev  # Just start the server - data persists!
```

### When You Register a New Company

When you use the `/register` page to create a company:
1. The data is saved to `server/prisma/dev.db`
2. It persists across server restarts
3. You can log in with the email/password you registered

**You DO NOT need to register again** unless you:
- Deleted the database file
- Ran `prisma migrate reset`
- Ran the seed script (which deletes all data)

## Verify Your Data Persists

1. Register a company at http://localhost:5173/register
2. Stop the server (Ctrl+C)
3. Start the server again: `npm run dev`
4. Try to log in with the same email/password
5. ✅ It should work! Your data persisted.

## Troubleshooting

### "I can't log in after server restart"

**Check 1:** Did you accidentally run the seed script?
```bash
# If you ran this, it deleted your registered company:
npm run prisma:seed
```

**Check 2:** Is the database file still there?
```bash
ls -la server/prisma/dev.db
# Should show a file with size > 0 bytes
```

**Check 3:** Check the actual data in the database:
```bash
cd server
npx prisma studio
# Open http://localhost:5555
# Click "Company" table
# You should see your registered company
```

### "The seed script creates different companies"

The seed script (`server/prisma/seedDev.ts`) creates:
- Nexus Technologies (nexustech.io)
- Alpha Corp, Beta Systems (sample data)

These are **different** from the company you register via the UI.

If you run the seed script after registering your own company, **your company data is deleted**.

## Production Recommendation

For production, use PostgreSQL instead of SQLite:

```bash
# server/.env
DATABASE_URL="postgresql://user:password@localhost:5432/standup_db"
```

SQLite is perfect for development but PostgreSQL handles concurrent users better.

## Summary

✅ **Your database DOES persist** - `dev.db` is a real file on disk
✅ **Don't run seed scripts after registering** - They delete all data
✅ **Use Prisma Studio to verify data** - `npx prisma studio`
✅ **Normal server restarts preserve data** - Just `npm run dev`
