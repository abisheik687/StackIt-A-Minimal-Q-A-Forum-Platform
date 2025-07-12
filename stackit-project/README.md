# StackIt - Q&A Platform

A modern, customizable Q&A platform built with Node.js, Express, React, and TypeScript. Think Stack Overflow, but tailored for your community's needs.

## 🚀 Features

- **User Authentication & Authorization** - Secure JWT-based auth with role management
- **Rich Question & Answer System** - Full CRUD operations with voting and acceptance
- **Real-time Updates** - Live notifications and updates using Socket.IO
- **Tagging System** - Organize questions with customizable tags
- **User Profiles** - Reputation system, followers, and detailed profiles
- **Advanced Search** - Full-text search across questions and answers
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Admin Dashboard** - Moderation tools and platform management

## 🏗️ Architecture

This is a monorepo containing:

- **backend/** - Express.js API server with Prisma ORM
- **frontend/** - React SPA with TypeScript and Tailwind CSS
- **shared/** - Common types and utilities

## 🛠️ Tech Stack

### Backend
- Node.js & Express.js
- TypeScript
- Prisma ORM with PostgreSQL
- JWT Authentication
- Socket.IO for real-time features
- Rate limiting & security middleware

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Socket.IO client for real-time updates
- Axios for API communication

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL database
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/stackit/qa-platform.git
   cd qa-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit the .env files with your configuration
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed the database (optional)
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

The backend will be available at `http://localhost:3001` and the frontend at `http://localhost:3000`.

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/stackit"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)
```env
VITE_API_BASE_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
```

## 📚 API Documentation

The API follows RESTful conventions with the following main endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/questions` - List questions with pagination
- `POST /api/questions` - Create new question
- `GET /api/questions/:id` - Get question details
- `POST /api/questions/:id/answers` - Add answer to question
- `PUT /api/answers/:id/accept` - Accept an answer
- `POST /api/answers/:id/vote` - Vote on an answer

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Stack Overflow's community-driven approach
- Built with modern web technologies and best practices
- Special thanks to the open-source community

---

**Happy coding! 🎉**

