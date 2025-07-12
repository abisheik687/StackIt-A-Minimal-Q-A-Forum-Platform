# StackIt Q&A Platform - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL database
- Git

### Local Development Setup

1. **Clone and Install**
   ```bash
   cd stackit-project
   npm install
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Copy environment file
   cp .env.example .env
   
   # Edit .env with your database URL and JWT secret
   nano .env
   
   # Install dependencies
   npm install
   
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations (requires PostgreSQL)
   npx prisma migrate dev
   
   # Optional: Seed with sample data
   npm run seed
   ```

3. **Start Development Server**
   ```bash
   # Start backend
   cd backend
   npm run dev
   
   # Backend will be available at http://localhost:3001
   ```

## 📁 Project Structure

```
stackit-project/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Main server file
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React application (to be implemented)
├── shared/                  # Shared types and utilities
├── package.json             # Root package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/stackit_dev"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🗄️ Database Setup

### PostgreSQL Setup

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE stackit_dev;
   CREATE USER stackit WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE stackit_dev TO stackit;
   \q
   ```

3. **Run Migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/refresh-token` - Refresh access token

### Questions
- `GET /api/questions` - List questions (with pagination)
- `POST /api/questions` - Create new question
- `GET /api/questions/:id` - Get question details
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/:id/vote` - Vote on question

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

### Health Check
- `GET /health` - Server health status

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run backend tests
cd backend && npm test

# Check build
cd backend && npm run build
```

## 🚀 Production Deployment

### Docker Deployment (Recommended)

1. **Create Dockerfile** (backend/Dockerfile):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. **Docker Compose** (docker-compose.yml):
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "3001:3001"
       environment:
         - DATABASE_URL=postgresql://stackit:password@db:5432/stackit
         - JWT_SECRET=your-production-secret
       depends_on:
         - db
     
     db:
       image: postgres:15
       environment:
         - POSTGRES_DB=stackit
         - POSTGRES_USER=stackit
         - POSTGRES_PASSWORD=password
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. **Build for Production**:
   ```bash
   cd backend
   npm run build
   ```

2. **Set Production Environment**:
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="your-production-db-url"
   export JWT_SECRET="your-production-secret"
   ```

3. **Start Server**:
   ```bash
   npm start
   ```

## 🔒 Security Considerations

- Change default JWT secret in production
- Use HTTPS in production
- Set up proper CORS origins
- Configure rate limiting appropriately
- Use environment variables for sensitive data
- Regular security updates

## 📊 Monitoring

- Health check endpoint: `/health`
- Logs are written to console (configure log aggregation)
- Monitor database connections
- Set up error tracking (Sentry, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy coding! 🎉**

