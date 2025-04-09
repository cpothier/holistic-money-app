import dotenv from 'dotenv';
import { pgPool, bigquery } from './db';

// Load environment variables
dotenv.config();

// Function to check clients in the database
async function checkClients() {
  try {
    console.log('🔍 Checking clients in the database...');
    
    // Get all clients from the database
    const clientsResult = await pgPool.query('SELECT * FROM clients ORDER BY client_name');
    const clients = clientsResult.rows;
    
    if (clients.length === 0) {
      console.log('❌ No clients found in the database.');
      return;
    }
    
    console.log(`✅ Found ${clients.length} clients:`);
    clients.forEach((client, index) => {
      console.log(`   ${index + 1}. client_name: ${client.client_name}, dataset: ${client.bigquery_dataset}, comments_table: ${client.comments_table_name}`);
    });
    
    // Check if "bb_design_marts" exists
    const bbDesign = clients.find(client => client.bigquery_dataset === 'bb_design_marts');
    if (bbDesign) {
      console.log(`\n✅ Client "${bbDesign.client_name}" found with dataset: ${bbDesign.bigquery_dataset}`);
      
      // Check comments for this client
      const commentsResult = await pgPool.query(
        `SELECT * FROM ${bbDesign.comments_table_name} ORDER BY updated_at DESC LIMIT 10`
      );
      
      console.log(`Found ${commentsResult.rows.length} comments for "${bbDesign.client_name}" in PostgreSQL.`);
      if (commentsResult.rows.length > 0) {
        console.log('Latest comments:');
        commentsResult.rows.slice(0, 3).forEach((comment, index) => {
          console.log(`   ${index + 1}. Entry: ${comment.entry_id}, Text: "${comment.comment_text.substring(0, 30)}${comment.comment_text.length > 30 ? '...' : ''}"`);
        });
      }
      
      // Check if BigQuery dataset exists
      try {
        const [exists] = await bigquery.dataset(bbDesign.bigquery_dataset).exists();
        if (exists) {
          console.log(`\n✅ BigQuery dataset "${bbDesign.bigquery_dataset}" exists.`);
          
          // Check if the table exists
          const [tableExists] = await bigquery.dataset(bbDesign.bigquery_dataset).table('financial_comments').exists();
          if (tableExists) {
            console.log(`✅ BigQuery table "${bbDesign.bigquery_dataset}.financial_comments" exists.`);
            
            // Check the contents of the table
            const query = `
              SELECT COUNT(*) as count
              FROM \`${process.env.PROJECT_ID}.${bbDesign.bigquery_dataset}.financial_comments\`
            `;
            
            const [countResult] = await bigquery.query(query);
            console.log(`Found ${countResult[0].count} comments in BigQuery table.`);
            
            if (countResult[0].count > 0) {
              const sampleQuery = `
                SELECT *
                FROM \`${process.env.PROJECT_ID}.${bbDesign.bigquery_dataset}.financial_comments\`
                ORDER BY updated_at DESC
                LIMIT 3
              `;
              
              const [sampleResult] = await bigquery.query(sampleQuery);
              console.log('Sample comments from BigQuery:');
              sampleResult.forEach((comment, index) => {
                console.log(`   ${index + 1}. Entry: ${comment.entry_id}, Text: "${comment.comment_text?.substring(0, 30)}${comment.comment_text?.length > 30 ? '...' : ''}"`);
              });
            }
          } else {
            console.log(`❌ BigQuery table "${bbDesign.bigquery_dataset}.financial_comments" does not exist.`);
          }
        } else {
          console.log(`❌ BigQuery dataset "${bbDesign.bigquery_dataset}" does not exist.`);
        }
      } catch (error) {
        console.error(`Error checking BigQuery: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('\n❌ Client "bb_design_marts" not found in the database.');
    }
    
    // Is there a "dd_design_marts" dataset?
    try {
      const [exists] = await bigquery.dataset('dd_design_marts').exists();
      if (exists) {
        console.log(`\n✅ BigQuery dataset "dd_design_marts" exists.`);
        
        // Check if the table exists
        const [tableExists] = await bigquery.dataset('dd_design_marts').table('financial_comments').exists();
        if (tableExists) {
          console.log(`✅ BigQuery table "dd_design_marts.financial_comments" exists.`);
          
          // Check the contents of the table
          const query = `
            SELECT COUNT(*) as count
            FROM \`${process.env.PROJECT_ID}.dd_design_marts.financial_comments\`
          `;
          
          const [countResult] = await bigquery.query(query);
          console.log(`Found ${countResult[0].count} comments in BigQuery table.`);
          
          if (countResult[0].count > 0) {
            const sampleQuery = `
              SELECT *
              FROM \`${process.env.PROJECT_ID}.dd_design_marts.financial_comments\`
              ORDER BY updated_at DESC
              LIMIT 3
            `;
            
            const [sampleResult] = await bigquery.query(sampleQuery);
            console.log('Sample comments from BigQuery:');
            sampleResult.forEach((comment, index) => {
              console.log(`   ${index + 1}. Entry: ${comment.entry_id}, Text: "${comment.comment_text?.substring(0, 30)}${comment.comment_text?.length > 30 ? '...' : ''}"`);
            });
          }
        } else {
          console.log(`❌ BigQuery table "dd_design_marts.financial_comments" does not exist.`);
        }
      } else {
        console.log(`\n❌ BigQuery dataset "dd_design_marts" does not exist.`);
      }
    } catch (error) {
      console.error(`Error checking BigQuery for dd_design_marts: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error('Error checking clients:', error instanceof Error ? error.message : String(error));
  } finally {
    // Close database connections
    await pgPool.end();
    process.exit(0);
  }
}

// Run the check
checkClients(); 