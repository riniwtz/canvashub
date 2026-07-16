This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Route entry points live in `app/`, while feature implementations live in `features/`.

## Project Structure

```text
app/                  Next.js pages, layouts, route handlers, and route boundaries
components/ui/        Shared shadcn UI primitives
features/
  accounts/           Tracked-account UI, validation, actions, and data access
  app-shell/          Global navigation and application chrome
  contacts/           Contact UI, queries, validation, actions, and data access
  courses/            Canvas course UI, synchronization, and API handlers
  dashboard/          Dashboard and home views
  work/               Work-management UI, queries, validation, actions, and data access
lib/                  Cross-feature infrastructure such as database, branding, and formatting
```

Keep `app/` modules thin and import feature implementations directly. Inside a
feature, place UI in `components/`, server-only actions and data access in
`server/`, and keep domain schemas, types, utilities, and tests at the feature
root. Shared UI primitives stay in `components/ui/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local PostgreSQL

The Docker service uses PostgreSQL 18, the `studenthub` database, and host port `5433` by default so it can coexist with a native PostgreSQL server on port `5432`.

```bash
cp .env.example .env
npm run db:up
npm run db:migrate
```

Use `npm run db:down` to stop the service. The database persists in the `studenthub-postgres-data` Docker volume. Override `POSTGRES_PORT`, credentials, and `DATABASE_URL` together when changing the local connection.

Run `db:migrate` only against a fresh database whose schema is managed by the committed Drizzle migrations. Existing databases created with `db:push` may contain tables without migration-ledger entries; do not mix the workflows until that database has been deliberately baselined. Generate a migration with `npm run db:generate -- --name=<change_name>` before migrating schema changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
