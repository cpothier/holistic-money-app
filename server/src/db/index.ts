import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure SSL options
const sslConfig = {
  rejectUnauthorized: false, // Add this line to fix the self-signed certificate issue
  ca: process.env.PG_CA_CERT ? fs.readFileSync(process.env.PG_CA_CERT).toString() : undefined
};

// Create connection pool
export const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'holistic_money',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  ssl: sslConfig,
  // Connection timeout (longer for cloud databases)
  connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '30000'),
  // Idle timeout
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
  // Statement timeout
  statement_timeout: parseInt(process.env.PG_STATEMENT_TIMEOUT || '30000'),
  // Max retries and connection pool settings
  max: 10,
  min: 1,
  // Application name for better debugging
  application_name: 'holistic_money_app',
});

// For handling connection issues
pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Attempt to reconnect
  setTimeout(() => {
    console.log('Attempting to reconnect to PostgreSQL...');
    pgPool.connect().then(client => {
      console.log('Successfully reconnected to PostgreSQL');
      client.release();
    }).catch(err => {
      console.error('Failed to reconnect to PostgreSQL:', err.message);
    });
  }, 5000);
});

// Initialize BigQuery client
export let bigquery: BigQuery;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_CONTENT) {
    console.log('Initializing BigQuery using credentials content');
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_CONTENT);
    bigquery = new BigQuery({
      projectId: process.env.PROJECT_ID || credentials.project_id,
      credentials: credentials
    });
    console.log('BigQuery initialized with credentials content');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Initializing BigQuery using credentials file');
    bigquery = new BigQuery({
      projectId: process.env.PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    console.log('BigQuery initialized with credentials file');
  } else {
    console.warn('No Google credentials found. BigQuery operations will fail.');
    // Create a dummy BigQuery instance as a fallback
    bigquery = new BigQuery({
      projectId: process.env.PROJECT_ID || 'unknown-project'
    });
  }
} catch (error) {
  console.error('Error initializing BigQuery client:', error);
  // Create a dummy BigQuery instance as a fallback
  bigquery = new BigQuery({
    projectId: process.env.PROJECT_ID || 'unknown-project'
  });
}

// Initialize database by running setup script
export const initializeDatabase = async () => {
  try {
    // Try to connect without running the setup script first
    console.log('Testing PostgreSQL connection...');
    console.log('Connection details:', {
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      ssl: process.env.PG_SSL === 'true' ? 'enabled' : 'disabled'
    });
    
    try {
      // Use a dedicated client with a longer timeout for initialization
      const client = await pgPool.connect();
      try {
        const result = await client.query('SELECT NOW()');
        console.log('PostgreSQL connected at:', result.rows[0].now);
        
        // Try to create a basic table to verify write access
        try {
          await client.query('DROP TABLE IF EXISTS connection_test');
          await client.query('CREATE TABLE connection_test (id SERIAL PRIMARY KEY, created_at TIMESTAMP DEFAULT NOW())');
          await client.query('INSERT INTO connection_test DEFAULT VALUES');
          await client.query('DROP TABLE connection_test');
          console.log('PostgreSQL write access verified');
          return true; // Return true if we can connect and write to the database
        } catch (writeError: unknown) {
          const writeErrorMsg = writeError instanceof Error ? writeError.message : String(writeError);
          console.warn('Could not verify write access:', writeErrorMsg);
          console.warn('Continuing anyway as this may just be a permissions issue...');
          return true; // Return true even if write test fails, as long as we can connect
        }
      } finally {
        client.release();
      }
    } catch (connError: unknown) {
      const errorMsg = connError instanceof Error ? connError.message : String(connError);
      console.error('PostgreSQL connection failed:', errorMsg);
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
    } catch (err) {
      const error = err as Error;
      console.error('Error running setup script:', error.message || 'Unknown error');
      console.error('Continuing anyway as this may just be a permissions issue...');
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

// Table names for PostgreSQL
export const plBudgetViewTable = 'pl_budget_with_comments';
export const financialCommentsTable = 'financial_comments'; 