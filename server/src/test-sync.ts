import dotenv from 'dotenv';
import path from 'path';
import { syncCommentsToBigQuery } from './services/syncService';
import { Pool } from 'pg';
import fs from 'fs';
import { BigQuery } from '@google-cloud/bigquery';

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Function to test the PostgreSQL to BigQuery synchronization
async function testSync() {
  let pool: Pool | null = null;
  
  try {
    console.log('🔍 SYNC TESTING UTILITY 🔍');
    console.log('=======================');
    
    const caCertPath = path.join(__dirname, '..', 'credentials', 'ca.pem');
    if (!fs.existsSync(caCertPath)) {
      throw new Error(`CA Certificate not found at ${caCertPath}`);
    }
    
    pool = new Pool({
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
    
    // 1. Get specific client
    console.log('Step 1: Checking client configuration...');
    const client = await pool.connect();
    try {
      const clientResult = await client.query(
        'SELECT * FROM clients WHERE client_name = $1',
        ['bb_design']
      );
      
      if (clientResult.rows.length === 0) {
        throw new Error('Client "bb_design" not found in the database.');
      }
      
      const clientConfig = clientResult.rows[0];
      console.log(`✅ Found client: ${clientConfig.client_name} (Dataset: ${clientConfig.bigquery_dataset})`);
      
      // 2. Check PostgreSQL comments count
      console.log('\nStep 2: Checking PostgreSQL comments count...');
      const pgCountResult = await client.query(
        `SELECT COUNT(*) FROM ${clientConfig.comments_table_name}`
      );
      const pgCount = parseInt(pgCountResult.rows[0].count);
      console.log(`Found ${pgCount} comments in PostgreSQL`);
      
      // 3. Run the export
      console.log('\nStep 3: Exporting comments from PostgreSQL to BigQuery...');
      await syncCommentsToBigQuery();
      
      // 4. Check BigQuery comments count
      console.log('\nStep 4: Checking BigQuery comments count...');
      const bigquery = new BigQuery({
        projectId: process.env.PROJECT_ID,
        keyFilename: path.join(__dirname, '..', 'credentials', 'service-account.json'),
      });
      
      const query = `
        SELECT COUNT(*) as count
        FROM \`${process.env.PROJECT_ID}.${clientConfig.bigquery_dataset}.financial_comments\`
      `;
      
      const [bqResult] = await bigquery.query(query);
      const bqCount = parseInt(bqResult[0].count);
      console.log(`Found ${bqCount} comments in BigQuery`);
      
      if (pgCount !== bqCount) {
        console.warn(`⚠️ Warning: Comment counts don't match! PostgreSQL: ${pgCount}, BigQuery: ${bqCount}`);
      } else {
        console.log(`✅ Success: Comment counts match! (${pgCount} comments)`);
      }
      
      console.log('\n✅ Sync test completed!');
    } finally {
      client.release();
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error during sync test:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the test
testSync(); 