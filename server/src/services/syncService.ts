import { Pool } from 'pg';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.PROJECT_ID,
  keyFilename: path.join(__dirname, '..', '..', 'credentials', 'service-account.json'),
});

// Initialize PostgreSQL pool with SSL
const caCertPath = path.join(__dirname, '..', '..', 'credentials', 'ca.pem');
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

// Function to export comments from PostgreSQL to BigQuery for a specific client
const exportCommentsForClient = async (client: any, force: boolean = true) => {
  try {
    console.log(`Exporting comments for client: ${client.client_name}`);
    
    // Get all comments from PostgreSQL for this client
    const commentsResult = await pool.query(
      `SELECT * FROM ${client.comments_table_name} ORDER BY updated_at DESC`
    );
    
    const comments = commentsResult.rows;
    
    if (comments.length === 0) {
      console.log(`No comments found in PostgreSQL for ${client.client_name}. Skipping export.`);
      return;
    }
    
    console.log(`Found ${comments.length} comments in PostgreSQL for ${client.client_name}. Exporting to BigQuery...`);
    
    // Define the BigQuery dataset and table
    const dataset = bigquery.dataset(client.bigquery_dataset);
    const mainTable = dataset.table('financial_comments');
    
    // Create a temporary table name with timestamp
    const tempTableName = `financial_comments_${Date.now()}`;
    const tempTable = dataset.table(tempTableName);
    
    // Define the schema
    const schema = [
      { name: 'entry_id', type: 'STRING' },
      { name: 'comment_text', type: 'STRING' },
      { name: 'created_by', type: 'STRING' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ];
    
    // Create the temporary table
    console.log(`Creating temporary table ${tempTableName}...`);
    await tempTable.create({ schema });
    
    // Prepare data for BigQuery
    const rows = comments.map(comment => ({
      entry_id: comment.entry_id,
      comment_text: comment.comment_text,
      created_by: comment.created_by,
      created_at: comment.created_at,
      updated_at: comment.updated_at
    }));
    
    // Insert data into temporary table
    console.log(`Inserting ${rows.length} comments into temporary table...`);
    await tempTable.insert(rows, { ignoreUnknownValues: true });
    
    // Verify insertion into temporary table
    try {
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.${tempTableName}\`
      `;
      
      const [countResult] = await bigquery.query(countQuery);
      console.log(`Record count in temporary table: ${countResult[0].count}`);
      
      if (countResult[0].count !== rows.length) {
        console.warn(`⚠️ Warning: Expected ${rows.length} records, but found ${countResult[0].count} records in temporary table.`);
      }
    } catch (verifyError) {
      console.error(`Error verifying insert into temporary table for ${client.client_name}:`, verifyError);
    }
    
    // Check if main table exists
    const [tableExists] = await mainTable.exists();
    
    if (tableExists) {
      // Replace the main table with the temporary table
      console.log(`Replacing main table with temporary table...`);
      const replaceQuery = `
        CREATE OR REPLACE TABLE \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.financial_comments\` AS
        SELECT * FROM \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.${tempTableName}\`
      `;
      
      await bigquery.query(replaceQuery);
      
      // Delete the temporary table
      console.log(`Deleting temporary table...`);
      await tempTable.delete();
    } else {
      // If main table doesn't exist, rename the temporary table
      console.log(`Main table doesn't exist. Renaming temporary table...`);
      await tempTable.copy(mainTable);
      await tempTable.delete();
    }
    
    // Verify final state
    try {
      const countQuery = `
        SELECT COUNT(*) as count 
        FROM \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.financial_comments\`
      `;
      
      const [countResult] = await bigquery.query(countQuery);
      console.log(`Final record count in main table: ${countResult[0].count}`);
    } catch (verifyError) {
      console.error(`Error verifying final state for ${client.client_name}:`, verifyError);
    }
    
    console.log(`Successfully exported ${comments.length} comments to BigQuery for ${client.client_name}.`);
    
    // Create or replace a view that shows only the latest comment for each entry_id
    console.log(`Creating view for latest comments in dataset ${client.bigquery_dataset}...`);
    
    const latestCommentsViewQuery = `
      CREATE OR REPLACE VIEW \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.latest_financial_comments\` AS
      SELECT c.*
      FROM (
        SELECT entry_id, MAX(updated_at) as max_updated_at
        FROM \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.financial_comments\`
        GROUP BY entry_id
      ) latest
      JOIN \`${process.env.PROJECT_ID}.${client.bigquery_dataset}.financial_comments\` c
      ON c.entry_id = latest.entry_id AND c.updated_at = latest.max_updated_at
    `;
    
    try {
      await bigquery.query(latestCommentsViewQuery);
      console.log(`Successfully created latest_financial_comments view in dataset ${client.bigquery_dataset}.`);
    } catch (viewError) {
      console.error(`Error creating view for ${client.client_name}:`, viewError);
    }
  } catch (error) {
    console.error(`Error exporting comments for ${client.client_name}:`, error);
    throw error; // Re-throw to propagate the error
  }
};

// Function to export all comments from PostgreSQL to BigQuery
export const syncCommentsToBigQuery = async (force: boolean = true) => {
  try {
    console.log('Starting comment export from PostgreSQL to BigQuery...');
    
    // Get all clients from the database
    const clientsResult = await pool.query('SELECT * FROM clients ORDER BY client_name');
    const clients = clientsResult.rows;
    
    if (clients.length === 0) {
      console.log('No clients found in the database. Skipping export.');
      return;
    }
    
    console.log(`Found ${clients.length} clients. Exporting comments for each client...`);
    
    // Export comments for each client
    for (const client of clients) {
      await exportCommentsForClient(client, force);
    }
    
    console.log('Completed comment export for all clients.');
  } catch (error) {
    console.error('Error exporting comments:', error);
    throw error; // Re-throw to propagate the error
  }
};

// Function to start the sync scheduler
export const startSyncScheduler = () => {
  if (process.env.SYNC_ENABLED !== 'true') {
    console.log('Sync scheduler is disabled. Skipping.');
    return;
  }
  
  const syncFrequency = parseInt(process.env.SYNC_FREQUENCY || '60');
  console.log(`Starting sync scheduler with frequency: ${syncFrequency} minutes`);
  
  // Only run initial sync if explicitly enabled
  if (process.env.SYNC_ON_STARTUP === 'true') {
    console.log('Initial sync on startup is enabled. Running now...');
    syncCommentsToBigQuery();
  } else {
    console.log('Initial sync on startup is disabled. Sync will only run on schedule or manual trigger.');
  }
  
  // Schedule regular syncs
  setInterval(() => {
    console.log('Running scheduled PostgreSQL to BigQuery sync...');
    syncCommentsToBigQuery();
  }, syncFrequency * 60 * 1000);
}; 