import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkClients() {
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_SSL === 'true' ? {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.join(__dirname, '..', process.env.PG_CA_CERT!)).toString(),
    } : false,
  });

  try {
    console.log('Checking clients table...');
    
    // Check existing clients
    const result = await pool.query('SELECT * FROM clients');
    console.log('\nExisting clients:', result.rows);
    
    // Insert default client if it doesn't exist
    const defaultClient = {
      client_name: 'austin_lifestyler',
      bigquery_dataset: 'austin_lifestyler_marts',
      comments_table_name: 'austin_lifestyler_comments'
    };
    
    await pool.query(`
      INSERT INTO clients (client_name, bigquery_dataset, comments_table_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (client_name) DO UPDATE 
      SET bigquery_dataset = $2, comments_table_name = $3
      RETURNING *
    `, [defaultClient.client_name, defaultClient.bigquery_dataset, defaultClient.comments_table_name]);
    
    // Verify the client exists
    const verifyResult = await pool.query('SELECT * FROM clients WHERE client_name = $1', [defaultClient.client_name]);
    console.log('\nDefault client after insert/update:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkClients(); 