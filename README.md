# Cybersecurity Log Analyzer

A comprehensive full-stack web application designed to analyze log files using artificial intelligence to detect security threats and anomalies. This application provides cybersecurity professionals and SOC analysts with an intelligent tool for log analysis, threat detection, and security monitoring.

## Overview

The Cybersecurity Log Analyzer is built with modern web technologies and integrates OpenAI's GPT-4o Mini model to provide intelligent analysis of various log file formats. The application can parse different types of logs including web server logs, proxy logs, application logs, and generic log formats. It automatically identifies suspicious activities, assigns threat levels, and provides detailed explanations for each detected anomaly.

## Key Features

**Intelligent Log Analysis**: The application uses OpenAI's advanced language model to analyze log entries and identify potential security threats. Each log entry is examined for suspicious patterns, unusual behavior, and security risks.

**Real-time Threat Detection**: Upload log files and receive immediate analysis with threat levels, confidence scores, and detailed explanations for each detected anomaly.

**Multiple Log Format Support**: The system can parse and analyze various log formats including Apache logs, Nginx logs, proxy logs, and generic log formats.

**User Authentication**: Secure JWT-based authentication system with password hashing and session management.

**Comprehensive Dashboard**: A modern, responsive dashboard that displays analysis results in an easy-to-understand format with filtering and sorting capabilities.

**Database Persistence**: All analysis results are stored in a PostgreSQL database for historical tracking and comparison.

**File Management**: Upload, view, and delete log files with automatic cleanup of associated analysis data.

## Technology Stack

**Frontend**: Next.js 15 with React, TypeScript, and Tailwind CSS for styling. The interface uses shadcn/ui components for a modern, professional appearance.

**Backend**: Node.js with Express.js framework, providing RESTful API endpoints for file upload, authentication, and log analysis.

**Database**: PostgreSQL for data persistence, with proper schema design for users, log files, and analysis results.

**AI Integration**: OpenAI GPT-4o Mini for intelligent log analysis and threat detection.

**Authentication**: JWT tokens with bcrypt password hashing for secure user sessions.

**Deployment**: Vercel for frontend deployment and serverless functions for backend API endpoints.

## Prerequisites

Before running this application, ensure you have the following installed on your system:

- Node.js version 18 or higher
- npm or yarn package manager
- PostgreSQL database server
- Git for version control

## Installation and Setup

### Step 1: Clone the Repository

First, clone the repository to your local machine:

```bash
git clone https://github.com/pranitha275/cybersecurity-log-analyzer.git
cd cybersecurity-log-analyzer
```

### Step 2: Install Dependencies

Install the required dependencies for both frontend and backend:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 3: Database Setup

Create a PostgreSQL database and configure the connection:

1. Create a new PostgreSQL database:
```sql
CREATE DATABASE cybersecurity_app;
```

2. Create a database user (optional but recommended):
```sql
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cybersecurity_app TO your_username;
```

3. Initialize the database schema by running the SQL script in `backend/database/init.sql`

### Step 4: Environment Configuration

Create environment files for both frontend and backend:

**Backend Environment (backend/.env):**
```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cybersecurity_app
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5001
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Frontend Environment (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### Step 5: OpenAI API Key

To use the AI analysis features, you need an OpenAI API key:

1. Sign up for an OpenAI account at https://platform.openai.com
2. Generate an API key from your dashboard
3. Add the API key to your backend environment file

### Step 6: Start the Application

Start both the backend and frontend servers:

**Terminal 1 - Backend Server:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend Server:**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:5001

## Usage Guide

### Creating an Account

1. Navigate to the application homepage
2. Click on "Sign up" to create a new account
3. Enter your email address and choose a secure password
4. Click "Sign up" to create your account

### Logging In

1. Enter your email address and password
2. Click "Login" to access the dashboard
3. You will be redirected to the main dashboard upon successful authentication

### Uploading Log Files

1. From the dashboard, click "Choose File" in the upload section
2. Select a log file (supported formats: .txt, .log)
3. Click "Upload" to process the file
4. The system will automatically parse and analyze the log entries

### Viewing Analysis Results

1. After upload, the dashboard will display analysis results
2. View the total number of log entries and detected anomalies
3. Click on individual files to see detailed analysis
4. Use the table to browse through all log entries with their threat levels

### Understanding Analysis Results

Each log entry is analyzed and includes:

**Status**: Indicates whether the entry is normal or suspicious
**Confidence Score**: A numerical value (0.70-0.90) indicating the AI's confidence in the analysis
**Threat Level**: Low, Medium, or High based on the perceived security risk
**Explanation**: Detailed reasoning provided by the AI for the classification
**Recommended Action**: Specific security recommendations for each threat

### File Management

1. View all uploaded files in the "Uploaded Files" section
2. Click on file names to view detailed analysis
3. Use the delete button to remove files and their associated analysis data
4. Refresh the dashboard to see updated file counts and statistics

## AI Analysis Process

The application uses a sophisticated AI analysis pipeline:

1. **Log Parsing**: Raw log files are parsed to extract structured data including timestamps, IP addresses, HTTP methods, status codes, and user agents.

2. **Context Analysis**: The AI examines each log entry in the context of surrounding entries to identify patterns and relationships.

3. **Threat Detection**: Using OpenAI's language model, the system identifies various types of security threats including:
   - Failed authentication attempts
   - Unauthorized access attempts
   - Suspicious API calls
   - Common attack patterns
   - Unusual traffic patterns

4. **Risk Assessment**: Each detected threat is assigned a confidence score and threat level based on the AI's analysis.

5. **Recommendation Generation**: The system provides specific, actionable recommendations for each detected threat.

## Security Features

The application implements several security measures:

**Authentication Security**: JWT tokens with secure storage and automatic expiration
**Password Security**: Bcrypt hashing for secure password storage
**Input Validation**: Comprehensive validation of all user inputs
**Rate Limiting**: Protection against brute force attacks
**CORS Configuration**: Proper cross-origin resource sharing settings
**File Upload Security**: Validation of file types and sizes

## Database Schema

The application uses three main database tables:

**Users Table**: Stores user account information with encrypted passwords
**Log Files Table**: Tracks uploaded files with metadata and user associations
**Log Entries Table**: Contains parsed log data with AI analysis results

Each log entry includes comprehensive analysis data including threat levels, confidence scores, and AI-generated explanations.

## Deployment

### Local Development

The application is configured for local development with hot reloading and debugging capabilities. Both frontend and backend servers support automatic restart on file changes.

### Production Deployment

For production deployment, the application can be deployed to Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in the Vercel dashboard
3. Deploy the application using Vercel's build system

The application is designed to work with Vercel's serverless functions for the backend API endpoints.

## Troubleshooting

### Common Issues

**Database Connection Errors**: Ensure PostgreSQL is running and the connection details in your environment file are correct.

**API Connection Errors**: Verify that both frontend and backend servers are running on the correct ports.

**File Upload Issues**: Check that the upload directory exists and has proper write permissions.

**Authentication Problems**: Ensure JWT_SECRET is properly configured and the database contains valid user accounts.

### Performance Optimization

For large log files, consider:
- Breaking files into smaller chunks for processing
- Using database indexing for faster queries
- Implementing pagination for large result sets

## Contributing

This project is designed as a demonstration of modern web development practices and AI integration. Contributions are welcome and should follow standard development practices including proper testing and documentation.

## License

This project is provided as-is for educational and demonstration purposes. Please ensure compliance with all applicable licenses and terms of service, particularly regarding the use of OpenAI's API.

## Support

For technical support or questions about the application, please refer to the project documentation or create an issue in the GitHub repository.

## Future Enhancements

Potential improvements for future versions include:
- Support for additional log formats
- Real-time log streaming and analysis
- Integration with security information and event management (SIEM) systems
- Advanced visualization and reporting features
- Machine learning model training on custom datasets
- Multi-tenant architecture for enterprise use

