import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...');
    console.log('Environment file path:', path.join(__dirname, '..', '.env'));
    
    const caCertPath = path.join(__dirname, '..', 'credentials', 'ca.pem');
    console.log('CA Certificate path:', caCertPath);
    
    if (!fs.existsSync(caCertPath)) {
      throw new Error(`CA Certificate not found at ${caCertPath}`);
    }
    
    const pool = new Pool({
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(caCertPath).toString(),
      },
    });

    console.log('Connection details:', {
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      ssl: 'enabled with certificate'
    });

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('PostgreSQL connected at:', result.rows[0].now);
      
      // Test clients table
      const clientsResult = await client.query('SELECT * FROM clients');
      console.log('Found clients:', clientsResult.rows.map(r => r.client_name));
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    const error = err as Error;
    console.error('Connection error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testConnection(); 