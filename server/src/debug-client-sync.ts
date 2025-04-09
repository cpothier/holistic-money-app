import dotenv from 'dotenv';
import { pgPool, bigquery } from './db';

// Load environment variables
dotenv.config();

// Function to check client-dataset mapping and sync status
async function debugClientSync() {
  try {
    console.log('🔍 Debugging client sync relationship...');
    
    // Get all clients from the database
    const clientsResult = await pgPool.query('SELECT * FROM clients ORDER BY client_name');
    const clients = clientsResult.rows;
    
    if (clients.length === 0) {
      console.log('❌ No clients found in the database.');
      return;
    }
    
    console.log(`✅ Found ${clients.length} clients with their BigQuery datasets:`);
    clients.forEach((client, index) => {
      console.log(`   ${index + 1}. Client Name: "${client.client_name}" -> BigQuery Dataset: "${client.bigquery_dataset}" -> Comments Table: "${client.comments_table_name}"`);
    });
    
    // First check austin_lifestyler - the one that works
    const austinClient = clients.find(client => client.client_name.toLowerCase().includes('austin'));
    if (austinClient) {
      console.log(`\n✅ REFERENCE: Found working client "${austinClient.client_name}" with dataset: "${austinClient.bigquery_dataset}"`);
      
      // Check if the dataset exists in BigQuery
      try {
        const [exists] = await bigquery.dataset(austinClient.bigquery_dataset).exists();
        console.log(`  - BigQuery dataset "${austinClient.bigquery_dataset}" exists: ${exists ? '✅ YES' : '❌ NO'}`);
        
        if (exists) {
          // Check if financial_comments table exists
          const [tableExists] = await bigquery.dataset(austinClient.bigquery_dataset).table('financial_comments').exists();
          console.log(`  - BigQuery table "${austinClient.bigquery_dataset}.financial_comments" exists: ${tableExists ? '✅ YES' : '❌ NO'}`);
        }
      } catch (error) {
        console.error(`  - Error checking BigQuery for dataset "${austinClient.bigquery_dataset}":`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Check for bb_design client
    const bbDesignClient = clients.find(client => client.client_name === 'bb_design' || client.client_name.toLowerCase().includes('bb_design'));
    if (bbDesignClient) {
      console.log(`\n✅ Found client "${bbDesignClient.client_name}" with dataset: "${bbDesignClient.bigquery_dataset}"`);
      
      // Check if the dataset exists in BigQuery
      try {
        const [exists] = await bigquery.dataset(bbDesignClient.bigquery_dataset).exists();
        console.log(`  - BigQuery dataset "${bbDesignClient.bigquery_dataset}" exists: ${exists ? '✅ YES' : '❌ NO'}`);
        
        if (exists) {
          // Check if financial_comments table exists
          const [tableExists] = await bigquery.dataset(bbDesignClient.bigquery_dataset).table('financial_comments').exists();
          console.log(`  - BigQuery table "${bbDesignClient.bigquery_dataset}.financial_comments" exists: ${tableExists ? '✅ YES' : '❌ NO'}`);
          
          if (tableExists) {
            // Count records
            const query = `
              SELECT COUNT(*) as count
              FROM \`${process.env.PROJECT_ID}.${bbDesignClient.bigquery_dataset}.financial_comments\`
            `;
            
            const [countResult] = await bigquery.query(query);
            console.log(`  - The table contains ${countResult[0].count} comment records.`);
            
            if (countResult[0].count > 0) {
              // Get sample records
              const sampleQuery = `
                SELECT *
                FROM \`${process.env.PROJECT_ID}.${bbDesignClient.bigquery_dataset}.financial_comments\`
                ORDER BY updated_at DESC
                LIMIT 3
              `;
              
              const [sampleResult] = await bigquery.query(sampleQuery);
              console.log('\nSample comments from BigQuery:');
              sampleResult.forEach((comment, index) => {
                console.log(`   ${index + 1}. Entry: ${comment.entry_id}, Text: "${comment.comment_text?.substring(0, 30)}${comment.comment_text?.length > 30 ? '...' : ''}", Updated: ${comment.updated_at}`);
              });
            }
          }
        }
      } catch (error) {
        console.error(`  - Error checking BigQuery for dataset "${bbDesignClient.bigquery_dataset}":`, error instanceof Error ? error.message : String(error));
      }
      
      // Check for comments in PostgreSQL
      try {
        const commentsResult = await pgPool.query(
          `SELECT * FROM ${bbDesignClient.comments_table_name} ORDER BY updated_at DESC LIMIT 10`
        );
        
        console.log(`\nFound ${commentsResult.rows.length} comments for "${bbDesignClient.client_name}" in PostgreSQL table "${bbDesignClient.comments_table_name}".`);
        if (commentsResult.rows.length > 0) {
          console.log('Sample comments from PostgreSQL:');
          commentsResult.rows.slice(0, 3).forEach((comment, index) => {
            console.log(`   ${index + 1}. Entry: ${comment.entry_id}, Text: "${comment.comment_text.substring(0, 30)}${comment.comment_text.length > 30 ? '...' : ''}", Updated: ${comment.updated_at}`);
          });
        }
      } catch (error) {
        console.error(`Error querying PostgreSQL comments table "${bbDesignClient.comments_table_name}":`, error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log(`\n❌ Client "bb_design" not found in the database.`);
      
      // Search for similar clients
      const similarClients = clients.filter(client => 
        client.client_name.toLowerCase().includes('bb') || 
        client.bigquery_dataset.toLowerCase().includes('bb')
      );
      
      if (similarClients.length > 0) {
        console.log('\nFound similar clients that might be bb_design:');
        similarClients.forEach((client, index) => {
          console.log(`   ${index + 1}. "${client.client_name}" with dataset "${client.bigquery_dataset}"`);
        });
      }
    }
    
    // Direct check for bb_design_marts dataset in BigQuery
    try {
      const possibleDatasets = ['bb_design_marts', 'bb_design', 'bbdesign_marts', 'bbdesign'];
      
      console.log('\nDirect check for possible bb_design datasets in BigQuery:');
      for (const dsName of possibleDatasets) {
        const [exists] = await bigquery.dataset(dsName).exists();
        console.log(`  - "${dsName}": ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        
        if (exists) {
          // Check for financial_comments table
          const [tableExists] = await bigquery.dataset(dsName).table('financial_comments').exists();
          console.log(`     - Table "financial_comments" in "${dsName}": ${tableExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        }
      }
    } catch (error) {
      console.error('Error checking BigQuery for possible bb_design datasets:', error instanceof Error ? error.message : String(error));
    }
    
    // Check BigQuery project config
    console.log('\nBigQuery configuration:');
    console.log(`  - Project ID: ${process.env.PROJECT_ID || 'Not set'}`);
    console.log(`  - Application Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Set' : '❌ Not set'}`);
    
  } catch (error) {
    console.error('Error during debug:', error instanceof Error ? error.message : String(error));
  } finally {
    // Close database connections
    await pgPool.end();
    process.exit(0);
  }
}

// Run the debug function
debugClientSync(); 