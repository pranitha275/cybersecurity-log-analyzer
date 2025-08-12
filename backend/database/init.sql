-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create log_files table
CREATE TABLE IF NOT EXISTS log_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'uploaded'
);

-- Create log_entries table
CREATE TABLE IF NOT EXISTS log_entries (
    id SERIAL PRIMARY KEY,
    log_file_id INTEGER REFERENCES log_files(id) ON DELETE CASCADE,
    timestamp TIMESTAMP,
    ip_address VARCHAR(45),
    event_description TEXT,
    status VARCHAR(50) DEFAULT 'normal',
    confidence_score DECIMAL(3,2),
    explanation TEXT,
    raw_log_line TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_log_files_user_id ON log_files(user_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_log_file_id ON log_entries(log_file_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_log_entries_ip_address ON log_entries(ip_address);
CREATE INDEX IF NOT EXISTS idx_log_entries_status ON log_entries(status); 