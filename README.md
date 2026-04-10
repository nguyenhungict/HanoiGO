# HanoiGO

Repository structure:
- `/actions`: NestJS backend
- `/client`: Next.js frontend

Scripts:
- `npm run install:all`
- `npm run dev`

## Database Management (Prisma)

When you modify `actions/prisma/schema.prisma`, follow these steps to sync with the database:

### 1. Standard Protocol (Recommended)
Use this to keep a history of your database changes in `prisma/migrations`.
```bash
cd actions
npx prisma migrate dev --name <describe_your_change>
```

### 2. Fast Prototyping
Use this to sync the database immediately without creating migration files (Warning: May lead to data loss if schema conflicts).
```bash
cd actions
npx prisma db push
```

### 3. Visual Management
Open Prisma Studio to view and edit data via a GUI.
```bash
cd actions
npx prisma studio
```
