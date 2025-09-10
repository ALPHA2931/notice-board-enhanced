# 📋 Digital Notice Board

A professional, modern digital notice board application for managing tasks, notes, and important information with an intuitive interface.

## ✨ Features

- **🎨 Professional Design** - Modern, clean interface with beautiful animations
- **🏷️ Color Coding** - 8 different colors to organize your notices
- **⚡ Priority Levels** - Low, Medium, High, and Urgent priority settings
- **🔍 Smart Search** - Search through all your notices instantly
- **📊 Statistics Dashboard** - Track your notices and urgent tasks
- **💾 Auto-Save** - All your data is automatically saved to local storage
- **📱 Responsive** - Works perfectly on desktop and mobile devices
- **⌨️ Keyboard Shortcuts** - Ctrl+N to add new notice, ESC to cancel

## 🚀 Live Demo

Visit the live application: [Digital Notice Board](https://your-github-username.github.io/notice-board-enhanced)

## Overview

This project enhances the original notice board with:
- **Multi-user support**: Share notices between multiple users
- **Real-time synchronization**: Live updates across all connected clients
- **Improved stability**: Robust backend architecture with proper error handling
- **Authentication**: Secure user management and authorization
- **Data persistence**: Reliable database storage for notices and user data

## Architecture

```
notice-board-enhanced/
├── src/
│   ├── backend/          # Server-side components
│   ├── frontend/         # Client-side application
│   └── shared/           # Shared types and utilities
├── config/               # Configuration files
├── docs/                 # Documentation
├── tests/                # Test files
├── scripts/              # Build and deployment scripts
└── docker/               # Docker configuration
```

## Features

- 📝 **Notice Management**: Create, read, update, and delete notices
- 👥 **User Collaboration**: Share notices with specific users or groups
- ⚡ **Real-time Updates**: Live synchronization using WebSockets
- 🔐 **Authentication**: Secure user registration and login
- 🎨 **Modern UI**: Responsive design with intuitive interface
- 📱 **Cross-platform**: Works on desktop and mobile devices
- 🐳 **Containerized**: Easy deployment with Docker

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO for WebSocket communication
- **Frontend**: React with TypeScript
- **Authentication**: JWT tokens with bcrypt
- **Styling**: Tailwind CSS
- **Testing**: Jest and React Testing Library
- **Deployment**: Docker and Docker Compose

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notice-board-enhanced
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp config/.env.example config/.env
   # Edit config/.env with your settings
   ```

4. **Start the database**
   ```bash
   docker-compose up -d postgres
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Check code style
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

## API Documentation

API documentation is available at `/api/docs` when running the server.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
