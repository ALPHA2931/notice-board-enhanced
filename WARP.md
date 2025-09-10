# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Initial Setup
```bash
# Install dependencies for both backend and frontend
npm install
cd src/frontend && npm install && cd ../..

# Setup environment variables
cp config/.env.example config/.env
# Edit config/.env with your database settings

# Database setup
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed with sample data (optional)
```

### Development Workflow
```bash
# Start development servers (both backend and frontend concurrently)
npm run dev

# Or start separately:
npm run dev:backend    # Start backend only (port 3001)
npm run dev:frontend   # Start frontend only (port 3000)

# Build for production
npm run build          # Build both backend and frontend
npm run build:backend  # Build backend only
npm run build:frontend # Build frontend only

# Start production server
npm start              # Runs built backend server
```

### Testing and Quality
```bash
# Run tests
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode

# Linting
npm run lint           # Check code style
npm run lint:fix       # Fix linting issues automatically
```

### Database Operations
```bash
npm run db:migrate     # Run pending migrations
npm run db:generate    # Regenerate Prisma client after schema changes
npm run db:seed        # Seed database with sample data
npm run db:studio      # Open Prisma Studio (database GUI)
```

### Docker Development
```bash
npm run docker:build  # Build Docker images
npm run docker:up     # Start all services with Docker
npm run docker:down   # Stop Docker services

# Database only with Docker (useful for local development)
docker-compose up -d postgres
```

### Running Individual Tests
```bash
# Run specific test files
npx jest src/backend/tests/auth.test.ts
npx jest src/frontend/src/components/NoticeCard.test.tsx

# Run tests matching a pattern
npx jest --testNamePattern="authentication"
```

## Architecture Overview

### Project Structure
This is a full-stack TypeScript application with a clear separation between backend and frontend:

- **Backend**: Node.js/Express API with PostgreSQL database
- **Frontend**: React with TypeScript, Tailwind CSS for styling
- **Real-time**: Socket.IO for live updates and collaboration
- **Database**: PostgreSQL with Prisma ORM for type-safe queries

### Backend Architecture (`src/backend/`)
- **`server.ts`**: Main Express server with middleware setup (CORS, rate limiting, security)
- **`routes/`**: RESTful API endpoints organized by resource (auth, notices, users)
- **`services/socketService.ts`**: Real-time WebSocket handling with authentication
- **`middleware/`**: Authentication, validation, and error handling
- **`utils/database.ts`**: Prisma client configuration
- **`prisma/schema.prisma`**: Database schema with comprehensive relationships

### Frontend Architecture (`src/frontend/`)
- **React 18** with TypeScript for type safety
- **React Router** for navigation
- **Context API** for state management (authentication, Socket.IO)
- **Tailwind CSS** with Headless UI components
- **React Hook Form** for form handling
- **Socket.IO Client** for real-time updates

### Database Schema (Key Models)
- **Users**: Authentication with profile information
- **Notices**: Main content entities with color, priority, expiration
- **NoticeShares**: Granular permission system (READ/WRITE/ADMIN) for users/groups
- **NoticeComments**: Threaded comments on notices
- **Groups**: User groups for bulk sharing
- **NoticeTag**: Tagging system for organization

### Real-time Features
The application uses Socket.IO for:
- **Live notice updates**: Changes broadcast to all users with access
- **Comment notifications**: Real-time comment additions
- **Typing indicators**: Show when users are typing comments
- **User presence**: Track online/offline status
- **Room-based updates**: Users only receive updates for notices they can access

### Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based permissions** at the notice level (author, shared users, public)
- **Group-based sharing** with hierarchical permissions
- **Socket.IO authentication** middleware for real-time features

### Development Environment
- **Node.js 18+** required
- **PostgreSQL** database (local or Docker)
- **Hot reload** for both backend (nodemon) and frontend (React scripts)
- **TypeScript compilation** with strict type checking
- **Environment-based configuration** with `.env` files

### Key Integration Points
- **API Communication**: Frontend uses Axios for HTTP requests to `/api/*` endpoints
- **Real-time Connection**: Socket.IO client connects to backend for live updates
- **Database Queries**: All database access through Prisma with type-safe queries
- **Error Handling**: Centralized error handling with user-friendly messages
- **Security**: Rate limiting, CORS, helmet for security headers

### Testing Strategy
- **Backend**: Jest for unit tests with database mocking
- **Frontend**: React Testing Library for component tests
- **Integration**: API endpoint testing with test database
- **E2E**: Manual testing workflow documented in tests/

### Deployment Configuration
- **Docker Compose**: Multi-service setup with PostgreSQL, backend, and frontend
- **Environment Variables**: Separate configs for development/production
- **Health Checks**: Built-in health endpoints for monitoring
- **Graceful Shutdown**: Proper cleanup of database connections and Socket.IO

### Common Development Patterns
When working on this codebase:
1. **Database Changes**: Always update Prisma schema first, then run migrations
2. **API Routes**: Follow RESTful conventions with proper error handling
3. **Real-time Updates**: Use Socket.IO room system for efficient broadcasting
4. **Frontend State**: Use React Context for global state, local state for component-specific data
5. **Type Safety**: Leverage TypeScript interfaces for API contracts between frontend/backend
