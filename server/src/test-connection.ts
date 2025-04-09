import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
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
    console.log('Testing PostgreSQL connection...');
    console.log('Connection details:', {
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      ssl: process.env.PG_SSL === 'true' ? 'enabled with CA cert' : 'disabled'
    });

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('PostgreSQL connected successfully at:', result.rows[0].now);
      
      // Test table access
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('\nAccessible tables:', tablesResult.rows.map(row => row.table_name));
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await pool.end();
  }
}

testConnection(); 