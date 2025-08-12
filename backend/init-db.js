const fs = require('fs');
const path = require('path');
const pool = require('./config/database');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the SQL initialization script
    const sqlPath = path.join(__dirname, 'database', 'init.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL script
    await pool.query(sqlScript);
    
    console.log('Database initialized successfully!');
    console.log('Tables created: users, log_files, log_entries');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initializeDatabase(); 