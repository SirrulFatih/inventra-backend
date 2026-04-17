# Inventra Backend

Backend API for Inventra, built with Express and Prisma.

## Tech Stack

- Node.js + Express
- Prisma ORM
- MySQL / MariaDB
- JWT authentication

## Folder Structure

```text
inventra-backend/
  prisma/
    schema.prisma
    migrations/
    seed.js
  src/
    controllers/
    middlewares/
    prisma/
    routes/
    services/
    utils/
    app.js
    server.js
  .env.example
  package.json
```

## Main Scripts

```bash
npm run dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start
```

## Environment

Copy and fill environment values:

```bash
cp .env.example .env
```

Required core variables:

- DATABASE_URL
- JWT_SECRET
- PORT

## RBAC Notes

- Read permissions are separated from manage permissions.
- GET endpoints use read_* (or compatible manage_* where needed).
- Write endpoints (POST/PUT/PATCH/DELETE) use manage_* permissions.

See details in docs/ARCHITECTURE.md.
