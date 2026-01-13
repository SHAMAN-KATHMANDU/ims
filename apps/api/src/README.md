# API Server

This is the backend API server for the project, built with Express, TypeScript, PostgreSQL, and Prisma.

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `apps/api` directory with the following variables:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
JWT_SECRET="your-secret-key-here-change-in-production"

# Create initial superAdmin credentials
SUPERADMIN_USERNAME="superadmin"
SUPERADMIN_PASSWORD="superadmin123"
```

### 3. Set Up PostgreSQL Database

```bash
docker-compose up -d
```

### 4. Run Prisma Migrations

Generate Prisma client and run migrations:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

Or manually:

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Create Initial SuperAdmin User

After running migrations, you need to create the first superAdmin user. This is done using a seed script:

```bash
pnpm prisma:seed
```

Or manually:

```bash
npx ts-node prisma/seed.ts
```

**Default Credentials:**

- Username: set `SUPERADMIN_USERNAME` in `.env`
- Password: set `SUPERADMIN_PASSWORD` in `.env`

**⚠️ Important:** Change the default password immediately after first login!

**Note:** The seed script will skip creating a superAdmin if one already exists with the same username.

### 6. Start the Server

For development:

```bash
pnpm dev
```

For production:

```bash
pnpm build
pnpm start
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Login (public)
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout` - Logout (requires authentication)

### Users (superAdmin only)

- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Products

- `POST /api/v1/products` - Create product (superAdmin and admin only)
- `GET /api/v1/products` - Get all products (superAdmin, admin & user)
- `GET /api/v1/products/:id` - Get product by ID (superAdmin & admin, user)
- `PUT /api/v1/products/:id` - Update product (superAdmin & admin only)
- `DELETE /api/v1/products/:id` - Delete product (superAdmin & admin only)

### Categories

- `POST /api/v1/categories` - Create category (superAdmin and admin only)
- `GET /api/v1/categories` - get all categeroes
- `GET /api/v1/categories/{id}` - Get category by ID
- `PUT /api/v1/categories/{id}` - Update a category
- `DELETE /api/v1/categories/{id}` - Delete a category

## User Roles

- **superAdmin**: Can perform CRUD operations on users
- **admin**: Can perform CRUD operations on products
- **user**: Can only view products

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

The JWT token is obtained from the login endpoint and contains the user's ID and role.
