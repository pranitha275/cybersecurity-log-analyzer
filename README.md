# Cybersecurity Log Analysis Application

A full-stack web application for uploading, parsing, and analyzing log files with AI-powered anomaly detection.

## Features

- **User Authentication**: Secure login/signup with JWT tokens
- **File Upload**: Upload and store log files (.txt, .log)
- **Log Analysis**: Parse and analyze log entries
- **Anomaly Detection**: AI-powered detection of unusual patterns
- **Dashboard**: Visual representation of analysis results
- **Responsive Design**: Modern UI that works on all devices

## Tech Stack

### Frontend
- **Next.js 15** with TypeScript
- **React 19** with hooks
- **Tailwind CSS** for styling
- **Shadcn/ui** components
- **Lucide React** icons

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **JWT** authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing

### Database
- **PostgreSQL 15** with proper indexing
- **Connection pooling** for performance

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Docker (optional, for containerized setup)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cybersecurity-app-frontend
   ```

2. **Start the services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

## Manual Setup

### 1. Database Setup

1. **Install PostgreSQL** and create a database:
   ```sql
   CREATE DATABASE cybersecurity_app;
   ```

2. **Run the initialization script**:
   ```bash
   psql -d cybersecurity_app -f backend/database/init.sql
   ```

### 2. Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp env.example .env
   ```

4. **Update environment variables** in `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=cybersecurity_app
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   PORT=5000
   NODE_ENV=development
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   ```

5. **Start the backend server**:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup

1. **Install dependencies** (from project root):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application** at http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Log Files
- `POST /api/logs/upload` - Upload log file (requires auth)
- `GET /api/logs/files` - Get user's uploaded files (requires auth)
- `GET /api/logs/analysis/:fileId` - Get analysis results (requires auth)

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR UNIQUE)
- `password_hash` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Log Files Table
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users)
- `filename` (VARCHAR)
- `original_filename` (VARCHAR)
- `file_size` (INTEGER)
- `file_path` (VARCHAR)
- `upload_date` (TIMESTAMP)
- `status` (VARCHAR)

### Log Entries Table
- `id` (SERIAL PRIMARY KEY)
- `log_file_id` (INTEGER REFERENCES log_files)
- `timestamp` (TIMESTAMP)
- `ip_address` (VARCHAR)
- `event_description` (TEXT)
- `status` (VARCHAR)
- `confidence_score` (DECIMAL)
- `explanation` (TEXT)
- `raw_log_line` (TEXT)
- `created_at` (TIMESTAMP)

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Rate Limiting**: Express rate limiter
- **CORS Protection**: Configured for production
- **Helmet**: Security headers
- **Input Validation**: Joi schema validation
- **File Type Validation**: Only .txt and .log files allowed
- **File Size Limits**: Configurable upload limits

## Development

### Running Tests
```bash
# Backend tests (when implemented)
cd backend && npm test

# Frontend tests (when implemented)
npm test
```

### Code Formatting
```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in environment variables
2. Update CORS origins for production domain
3. Use a production PostgreSQL instance
4. Set secure JWT secret
5. Configure proper file upload paths

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Set `NEXT_PUBLIC_API_URL` environment variable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email venkata@tenex.ai or create an issue in the repository. 

## Auth changes
- Backend now sets an HttpOnly `auth_token` cookie on login/signup and accepts it for protected routes.
- Frontend no longer persists tokens in localStorage; requests include credentials and rely on the cookie.
- `.env.example` documents `ALLOWED_ORIGINS` for CORS and `NEXT_PUBLIC_API_URL` for the frontend.


## AI Approach

The anomaly detection engine uses a hybrid method:

1. **Rule-based heuristics**: Pattern matching for suspicious IPs, unusual request rates, or HTTP status anomalies.
2. **Optional LLM analysis**: If `OPENAI_API_KEY` or `HUGGINGFACE_API_KEY` is set in the backend environment, the `aiAnalyzer.js` will call an external API for deeper semantic anomaly scoring.
3. **Output fields**:
   - `status` (string) – label such as "normal", "suspicious"
   - `confidence_score` (0-1) – float representing certainty
   - `explanation` – human-readable reason
   - `threat_level` – numeric severity indicator

If no API keys are provided, detection defaults to local rules.

## Database Setup

1. Install and run PostgreSQL locally.
2. Create a database, e.g., `logs`.
3. Update `backend/.env` with:
   ```
   DATABASE_URL=postgres://user:pass@localhost:5432/logs
   ```
4. Initialize tables:
   ```bash
   cd backend
   node init-db.js
   ```

## Running Locally

1. **Setup env files**:
   ```bash
   cp .env.example .env
   cp backend/env.example backend/.env
   ```
   Edit `JWT_SECRET`, `DATABASE_URL`, and API URLs.

2. **Install deps**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Run backend**:
   ```bash
   cd backend
   npm run start
   ```

4. **Run frontend**:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Sample Logs

Sample files are in `sample-logs/`:
- `apache.log` – basic Apache access logs.
- `proxy.csv` – simulated proxy logs.

Upload them after login to see detection in action.

## Docker Compose (optional)

A `docker-compose.yml` is included for quick start with Postgres, backend, and frontend:
```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001/api
- Postgres: localhost:5432
```

