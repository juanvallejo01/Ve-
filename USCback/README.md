# USConnect Backend

Production-ready backend for university social platform built with NestJS, supporting ~20,000 users.

## Tech Stack

- **Framework**: NestJS (latest stable)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache/Rate Limiting**: Redis
- **Authentication**: JWT with Refresh Tokens
- **Language**: TypeScript (strict mode)

## Architecture

Modular domain-driven architecture with clean separation of concerns:

```
src/
├── modules/           # Domain modules
│   ├── auth/         # Authentication & JWT
│   ├── users/        # User management
│   ├── likes/        # Like system with rate limiting
│   ├── matches/      # Match creation & retrieval
│   ├── chat/         # Messaging with match validation
│   ├── notifications/# Notification system
│   ├── leaderboard/  # Cached ranking system
│   └── admin/        # Admin dashboard
├── common/           # Shared utilities
│   ├── guards/       # Auth & role guards
│   ├── decorators/   # Custom decorators
│   ├── interceptors/ # Logging & transformation
│   ├── filters/      # Exception handling
│   ├── prisma/       # Database service
│   └── redis/        # Cache service
├── config/           # Configuration
└── main.ts           # Application entry
```

## Core Features

### 1. Authentication
- JWT access tokens (15 min)
- Refresh tokens (7 days, stored in DB)
- HTTP-only cookie support
- Token blacklisting on logout
- Bcrypt password hashing

### 2. Like System
- Permanent likes (no unlike)
- Automatic match creation on mutual like
- Notifications on match
- Rate limiting:
  - 20 likes/minute
  - 100 likes/day
- Atomic transactions for data consistency

### 3. Chat System
- Match-only messaging
- Rate limiting: 30 messages/minute
- Message length validation (max 1000 chars)
- Conversation history

### 4. Leaderboard
- Cached rankings (60s TTL)
- Based on likesCount (indexed)
- Individual rank lookup
- Optimized queries

### 5. Admin Dashboard
- Platform statistics
- User management
- Leaderboard view
- Reset functionality (protected)

## Business Rules (Enforced)

1. ✅ Likes are permanent (no unlike)
2. ✅ No self-likes
3. ✅ No duplicate likes
4. ✅ Match auto-created on mutual like
5. ✅ Chat only allowed with matches
6. ✅ Ranking based on likesCount
7. ✅ Notifications on match creation
8. ✅ All validations in backend

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop
- pnpm/npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### Development

```bash
# Start PostgreSQL and Redis with Docker
docker compose -f docker-compose.dev.yml up -d

# Start development server
npm run start:dev
```

Server runs on http://localhost:3000

### Production Build

```bash
# Build application
npm run build

# Start production server
npm run start:prod
```

## Docker Deployment

### Development

```bash
# Start only database services
docker compose -f docker-compose.dev.yml up -d
```

### Production

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/random` - Get random users to like
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/me` - Update profile
- `DELETE /api/users/me` - Delete account (soft delete)

### Likes
- `POST /api/likes` - Create like
- `GET /api/likes/sent` - Get sent likes
- `GET /api/likes/received` - Get received likes

### Matches
- `GET /api/matches` - Get all matches

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversation/:userId` - Get conversation with user

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

### Leaderboard
- `GET /api/leaderboard` - Get top users
- `GET /api/leaderboard/my-rank` - Get current user rank

### Admin (Requires ADMIN role)
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - Get all users (paginated)
- `GET /api/admin/leaderboard` - Admin leaderboard view
- `POST /api/admin/reset-likes` - Reset all likes count
- `DELETE /api/admin/users/:id` - Delete user

### Health
- `GET /health` - Health check

## Environment Variables

```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/uscback

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3001

# Rate Limits
RATE_LIMIT_LIKES_PER_MINUTE=20
RATE_LIMIT_LIKES_PER_DAY=100
RATE_LIMIT_MESSAGES_PER_MINUTE=30
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Performance Optimizations

- ✅ Database indexes on hot queries
- ✅ Redis caching for leaderboard
- ✅ Connection pooling
- ✅ Prisma transactions for consistency
- ✅ No N+1 queries
- ✅ Rate limiting to prevent abuse
- ✅ Efficient ordered pair storage for matches

## Security

- ✅ Helmet for security headers
- ✅ CORS configuration
- ✅ Global validation pipe
- ✅ DTO validation
- ✅ Global exception filter
- ✅ No stack traces in production
- ✅ Password hashing
- ✅ JWT with expiration
- ✅ Refresh token rotation

## Database Schema

### User
- Soft delete support
- Indexed likesCount for leaderboard
- Role-based access control

### Like
- Unique constraint on (senderId, receiverId)
- Prevents duplicate likes
- Database-level validation

### Match
- Ordered pair storage (userAId < userBId)
- Unique constraint prevents duplicates
- Efficient lookup

### Message
- Indexed for conversation queries
- Length validation
- Match-only constraint enforced in service

### Notification
- Type-based (extensible)
- Read/unread tracking
- Indexed for performance

## Scalability Considerations

- Horizontal scaling ready
- Stateless design
- Redis for distributed caching
- Database connection pooling
- Optimized queries with proper indexes
- Rate limiting to prevent abuse
- Designed for 20,000+ users

## License

MIT
