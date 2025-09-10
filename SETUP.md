# Notice Board Enhanced - Setup Instructions

## Prerequisites

Before you can run this application, you need to install:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Docker** (optional, for containerized deployment)
   - Download from: https://www.docker.com/get-started
   - Verify installation: `docker --version`

3. **PostgreSQL** (if not using Docker)
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=postgres123 -d -p 5432:5432 postgres:15`

## Quick Start

### Option 1: Docker (Recommended)

1. **Install Node.js and Docker** (see prerequisites above)

2. **Clone and setup the project:**
   ```bash
   # You're already in the project directory
   cd notice-board-enhanced
   ```

3. **Start with Docker:**
   ```bash
   # Start all services (database, backend, frontend)
   docker-compose up --build
   
   # Or run in background
   docker-compose up -d --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### Option 2: Local Development

1. **Install Node.js** (see prerequisites above)

2. **Setup environment variables:**
   ```bash
   cp config/.env.example config/.env
   # Edit config/.env with your database settings
   ```

3. **Install dependencies:**
   ```bash
   npm install
   cd src/frontend && npm install
   cd ../..
   ```

4. **Start PostgreSQL database** (if not using Docker):
   ```bash
   # Using Docker for database only
   docker run --name postgres -e POSTGRES_PASSWORD=postgres123 -d -p 5432:5432 postgres:15
   
   # Or install PostgreSQL locally and create database
   createdb notice_board
   ```

5. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

6. **Start the application:**
   ```bash
   # Start both backend and frontend
   npm run dev
   
   # Or start them separately:
   # Terminal 1: npm run dev:backend
   # Terminal 2: npm run dev:frontend
   ```

## Database Setup

The application uses PostgreSQL with Prisma ORM. The schema includes:

- **Users**: Authentication and user profiles
- **Notices**: Main notice entities with content, priority, colors
- **NoticeShares**: Permission system for sharing notices
- **NoticeComments**: Comments on notices
- **NoticeTags**: Tagging system for notices
- **Groups**: User groups for bulk sharing
- **GroupMembers**: Group membership management

## Features Implemented

### Backend Features ✅
- **Authentication System**: JWT-based login/register
- **Notice CRUD Operations**: Create, read, update, delete notices
- **Sharing System**: Share notices with users/groups with permissions
- **Real-time Communication**: Socket.IO for live updates
- **Comment System**: Add comments to notices
- **Database Schema**: Comprehensive PostgreSQL schema
- **API Endpoints**: RESTful API with validation
- **Security**: Rate limiting, CORS, helmet, input validation

### Frontend Features ✅
- **React with TypeScript**: Modern frontend stack
- **Authentication UI**: Login and registration forms
- **Routing**: React Router for navigation
- **State Management**: Context API for auth and socket
- **Real-time Updates**: Socket.IO client integration
- **Responsive Design**: Tailwind CSS styling
- **Error Handling**: Toast notifications

### Deployment Features ✅
- **Docker Configuration**: Multi-service setup
- **Environment Configuration**: Configurable settings
- **Health Checks**: Application monitoring
- **Production Ready**: Security and performance optimizations

## Next Steps

1. **Install Node.js** to run the application
2. **Customize the UI** - Add more notice board features
3. **Enhance Security** - Change JWT secret, add rate limiting rules
4. **Add Features**:
   - File attachments to notices
   - Email notifications
   - Advanced search and filtering
   - User avatars and profiles
   - Group management UI
5. **Deploy to Production** - Use cloud services like AWS, Heroku, or DigitalOcean

## Development Commands

```bash
# Install all dependencies
npm install

# Run development server (both frontend and backend)
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Build for production
npm run build

# Run tests
npm test

# Database operations
npm run db:migrate      # Run migrations
npm run db:generate     # Generate Prisma client
npm run db:seed         # Seed database with sample data
npm run db:studio       # Open Prisma Studio

# Docker operations
npm run docker:build    # Build Docker images
npm run docker:up       # Start Docker services
npm run docker:down     # Stop Docker services
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Change ports in `docker-compose.yml` or `.env` file

2. **Database connection failed**:
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in config/.env

3. **Node modules not found**:
   - Run `npm install` in both root and `src/frontend` directories

4. **Prisma client not generated**:
   - Run `npm run db:generate`

### Need Help?

The application structure is well-organized with:
- `/src/backend` - Server-side code
- `/src/frontend` - React application
- `/src/shared` - Shared utilities and types
- `/config` - Configuration files
- `/docker` - Docker configuration
- `/docs` - Documentation

Each component is documented and follows modern development practices.
