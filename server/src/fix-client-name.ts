import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixClientName() {
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
    console.log('Fixing client name...');
    
    // First, check what clients exist
    const existingClients = await pool.query('SELECT * FROM clients');
    console.log('\nExisting clients before update:', existingClients.rows);
    
    // Update the client name to exactly match what the frontend expects
    const updateResult = await pool.query(`
      UPDATE clients 
      SET client_name = 'austin_lifestyler'
      WHERE LOWER(client_name) = 'austin lifestyler'
      RETURNING *
    `);
    
    console.log('\nUpdate result:', updateResult.rows);
    
    // Verify the client exists with the correct name
    const verifyResult = await pool.query('SELECT * FROM clients WHERE client_name = $1', ['austin_lifestyler']);
    console.log('\nClient after update:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixClientName(); 