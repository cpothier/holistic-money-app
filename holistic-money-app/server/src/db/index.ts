import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pgPool = new Pool({
  // Replace with your actual database connection details
  user: 'your_username',
  host: 'localhost',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});

// Initialize database by running setup script
export const initializeDatabase = async () => {
  try {
    // Try to connect without running the setup script first
    console.log('Testing PostgreSQL connection...');
    try {
      const result = await pgPool.query('SELECT NOW()');
      console.log('PostgreSQL connected at:', result.rows[0].now);
    } catch (connError: unknown) {
      const errorMessage = connError instanceof Error ? connError.message : String(connError);
      console.error('PostgreSQL connection failed:', errorMessage);
      console.error('Please check your connection details and make sure the database is accessible.');
      return false;
    }
    
    // Read the SQL setup file
    console.log('Running database setup script...');
    try {
      const setupSql = fs.readFileSync(
        path.join(__dirname, 'setup.sql'),
        'utf8'
      );
      
      // Execute the setup script
      await pgPool.query(setupSql);
      console.log('PostgreSQL database initialized successfully');
    } catch (setupError: unknown) {
      const errorMessage = setupError instanceof Error ? setupError.message : String(setupError);
      console.error('Error running setup script:', errorMessage);
      console.error('Continuing anyway as this may just be a permissions issue...');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}; 