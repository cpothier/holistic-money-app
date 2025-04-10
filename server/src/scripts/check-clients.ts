import { pgPool } from '../db';
import { config } from 'dotenv';
import path from 'path';

async function checkClients() {
  try {
    // Load environment variables
    const envPath = path.resolve(__dirname, '../../.env');
    console.log('Loading environment variables from:', envPath);
    config({ path: envPath });

    // Connect to database
    console.log('Connecting to database...');
    const client = await pgPool.connect();
    console.log('Connected to database');

    // Query clients table
    console.log('Querying clients table...');
    const result = await client.query('SELECT * FROM clients ORDER BY client_name');
    console.log(`Found ${result.rows.length} clients:`);
    
    result.rows.forEach(row => {
      console.log(`
Client ID: ${row.client_id}
Client Name: ${row.client_name}
BigQuery Dataset: ${row.bigquery_dataset}
Comments Table: ${row.comments_table_name}
      `);
    });

    // Release the client
    client.release();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // End the pool
    await pgPool.end();
  }
}

checkClients(); 