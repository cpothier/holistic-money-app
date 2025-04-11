import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { 
  pgPool, bigquery, plBudgetViewTable, financialCommentsTable, 
  initializeDatabase 
} from './db';
import { syncCommentsToBigQuery, startSyncScheduler } from './services/syncService';
import userRoutes from './routes/userRoutes';
import { authenticateToken, checkClientAccess } from './middleware/auth';
import { initializeUserManagement } from './db/initUserManagement';
import { UserService } from './services/userService';
import { setupCredentialFiles } from './utils/credentials';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;
let postgresConnected = false;  // Global flag to track Postgres connection status

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`Origin ${origin} not allowed by CORS policy. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(null, false);
      }
    },
    credentials: true
  })
);
app.use(express.json());

// User management routes
app.use('/api', userRoutes);

// API Routes - Clients
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    // Get all clients from the database
    const result = await pgPool.query('SELECT * FROM clients ORDER BY client_name');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { client_name, bigquery_dataset } = req.body;
    
    if (!client_name || !bigquery_dataset) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Generate a table name based on the client name (lowercase, underscores)
    const comments_table_name = `${client_name.toLowerCase().replace(/\s+/g, '_')}_comments`;
    
    // Insert the new client
    const result = await pgPool.query(`
      INSERT INTO clients (client_name, bigquery_dataset, comments_table_name)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [client_name, bigquery_dataset, comments_table_name]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ 
      message: 'Failed to add client',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Add PATCH endpoint for updating clients
app.patch('/api/clients/:client_id', async (req, res) => {
  try {
    const { client_id } = req.params;
    const { client_name, bigquery_dataset } = req.body;
    
    if (!client_name || !bigquery_dataset) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Generate a table name based on the client name (lowercase, underscores)
    const comments_table_name = `${client_name.toLowerCase().replace(/\s+/g, '_')}_comments`;
    
    // Update the client
    const result = await pgPool.query(`
      UPDATE clients 
      SET client_name = $1, bigquery_dataset = $2, comments_table_name = $3
      WHERE client_id = $4
      RETURNING *
    `, [client_name, bigquery_dataset, comments_table_name, client_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      message: 'Failed to update client',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// API Routes - Financial Data (still from BigQuery)
app.get('/api/financial-data', authenticateToken, checkClientAccess, async (req, res) => {
  try {
    // Safely access the month and client query parameters
    const monthParam = req.query.month;
    const clientParam = req.query.client;
    const month = typeof monthParam === 'string' ? monthParam : undefined;
    const client = typeof clientParam === 'string' ? clientParam : undefined;
    
    console.log(`Fetching financial data for client: ${client}, month: ${month || 'all'}`);
    
    // Get the client's BigQuery dataset - using case-insensitive comparison
    const clientResult = await pgPool.query(
      'SELECT bigquery_dataset FROM clients WHERE LOWER(client_name) = LOWER($1)',
      [client]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: `Client '${client}' not found` });
    }
    
    const bigqueryDataset = clientResult.rows[0].bigquery_dataset;
    console.log('Found BigQuery dataset for client:', bigqueryDataset);
    
    // Get financial data from BigQuery
    let query = `
      SELECT
        entry_id,
        ordering_id,
        txnDate,
        parent_account,
        sub_account,
        child_account,
        actual,
        budget_amount
      FROM \`${process.env.PROJECT_ID}.${bigqueryDataset}.${plBudgetViewTable}\`
    `;
    
    // Add month filter if provided
    if (month) {
      try {
        const [year, monthNum] = month.split('-').map(Number);
        if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
          throw new Error('Invalid date format. Expected YYYY-MM');
        }
        
        // Directly query for the month and year with more explicit date handling
        const formattedMonth = `${year}-${monthNum.toString().padStart(2, '0')}`;
        query += `
          WHERE REGEXP_CONTAINS(CAST(txnDate AS STRING), r'^${formattedMonth}')
        `;
        
        console.log(`Filtering by month: ${month} (Year: ${year}, Month: ${monthNum})`);
      } catch (err) {
        console.warn('Invalid month format:', month);
        // Continue without date filter if invalid
      }
    }
    
    query += ` ORDER BY ordering_id, txnDate, parent_account`;
    
    console.log('Executing BigQuery query for financial data');
    const [financialRows] = await bigquery.query(query);
    
    // Log sample dates to diagnose format issues
    if (financialRows.length > 0) {
      const sampleDates = financialRows.slice(0, 5).map(row => {
        // Get date parts to verify the correct month/year
        let dateParts: { year: number | null, month: number | null, day: number | null } = { 
          year: null, 
          month: null, 
          day: null 
        };
        let dateStr = '';
        
        if (row.txnDate) {
          if (typeof row.txnDate === 'string') {
            dateStr = row.txnDate;
          } else if (typeof row.txnDate === 'object') {
            dateStr = row.txnDate.value || row.txnDate.toString();
          }
          
          // Try to parse the date
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              dateParts = {
                year: date.getFullYear(),
                month: date.getMonth() + 1, // JS months are 0-indexed
                day: date.getDate()
              };
            }
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }
        
        return {
          entry_id: row.entry_id,
          parent_account: row.parent_account,
          txnDate: row.txnDate,
          txnDateString: dateStr,
          dateParts,
          actual: row.actual,
          budget: row.budget_amount
        };
      });
      
      console.log('Sample rows from results:', JSON.stringify(sampleDates, null, 2));
      console.log(`Total rows returned: ${financialRows.length}`);
    }
    
    // Get comments from PostgreSQL
    let comments: any[] = [];
    // Only attempt to get comments if PostgreSQL is connected
    if (postgresConnected) {
      // Get the client's comments table name - using case-insensitive comparison
      const tableResult = await pgPool.query(
        'SELECT comments_table_name FROM clients WHERE LOWER(client_name) = LOWER($1)',
        [client]
      );
      
      if (tableResult.rows.length > 0) {
        const commentsTableName = tableResult.rows[0].comments_table_name;
        
        // Get comments from PostgreSQL
        const entryIds = financialRows.map((row: any) => row.entry_id);
        
        if (entryIds.length > 0) {
          console.log('Fetching comments from PostgreSQL for', entryIds.length, 'entries');
          try {
            const commentResult = await pgPool.query(`
              SELECT DISTINCT ON (entry_id) 
                entry_id, comment_id, comment_text, created_by, created_at, updated_at 
              FROM ${commentsTableName}
              WHERE entry_id = ANY($1)
              ORDER BY entry_id, updated_at DESC
            `, [entryIds]);
            
            comments = commentResult.rows;
          } catch (pgError) {
            console.error('Error fetching comments from PostgreSQL:', pgError);
            // Continue without comments
          }
        }
      }
    }
    
    // Create a map for faster lookups
    const commentsByEntryId: {[key: string]: any} = {};
    comments.forEach(comment => {
      commentsByEntryId[comment.entry_id] = comment;
    });
    
    // Group and aggregate data by account hierarchy
    const groupedData = financialRows.reduce((acc: {[key: string]: any}, row: any) => {
      // Create a composite key for grouping
      const groupKey = `${row.parent_account}|${row.sub_account || ''}|${row.child_account || ''}`;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          parent_account: row.parent_account,
          sub_account: row.sub_account,
          child_account: row.child_account,
          actual: 0,
          budget_amount: 0,
          entry_ids: [], // Keep track of all entry_ids in this group
          txnDates: [],  // Keep track of all transaction dates
          ordering_id: row.ordering_id, // Store the ordering_id
        };
      }
      
      // Sum values
      acc[groupKey].actual += Number(row.actual || 0);
      acc[groupKey].budget_amount += Number(row.budget_amount || 0);
      acc[groupKey].entry_ids.push(row.entry_id);
      if (row.txnDate) acc[groupKey].txnDates.push(row.txnDate);
      
      return acc;
    }, {});
    
    // Convert grouped data back to array
    const aggregatedData = Object.values(groupedData).map((group: any) => {
      // Find the most recent comment for any entry_id in this group
      let latestComment = null;
      let latestCommentDate = null;
      
      for (const entryId of group.entry_ids) {
        const comment = commentsByEntryId[entryId];
        if (comment) {
          const commentDate = new Date(comment.created_at).getTime();
          if (!latestCommentDate || commentDate > latestCommentDate) {
            latestComment = comment;
            latestCommentDate = commentDate;
          }
        }
      }
      
      // Use the first entry_id as representative for this group (for comment actions)
      const representativeEntryId = group.entry_ids[0];
      
      return {
        entry_id: representativeEntryId,
        ordering_id: group.ordering_id,
        parent_account: group.parent_account,
        sub_account: group.sub_account,
        child_account: group.child_account,
        actual: group.actual,
        budget_amount: group.budget_amount,
        comment_text: latestComment ? latestComment.comment_text : null,
        comment_by: latestComment ? latestComment.created_by : null,
        comment_date: latestComment ? latestComment.created_at : null,
        txnDate: group.txnDates.length > 0 ? group.txnDates[0] : null
      };
    });
    
    // Sort the aggregated data by ordering_id first
    aggregatedData.sort((a: any, b: any) => {
      // Sort by ordering_id first
      if (a.ordering_id !== b.ordering_id) {
        return a.ordering_id.localeCompare(b.ordering_id);
      }
      // Fallback to account hierarchy if ordering_id is the same
      if (a.parent_account !== b.parent_account) {
        return a.parent_account.localeCompare(b.parent_account);
      }
      if (a.sub_account !== b.sub_account) {
        return (a.sub_account || '').localeCompare(b.sub_account || '');
      }
      return (a.child_account || '').localeCompare(b.child_account || '');
    });
    
    // Calculate totals
    const totalActual = aggregatedData.reduce((sum: number, row: any) => sum + Number(row.actual || 0), 0);
    const totalBudget = aggregatedData.reduce((sum: number, row: any) => sum + Number(row.budget_amount || 0), 0);
    
    res.json({
      data: aggregatedData,
      totalActual,
      totalBudget,
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch financial data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// API Routes - Comments (now using client-specific tables)
app.post('/api/financial-comments', async (req, res) => {
  try {
    const { entry_id, comment_text, created_by, client } = req.body;
    
    if (!entry_id || !comment_text || !created_by || !client) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const comment_id = uuidv4();
    const timestamp = new Date();
    
    // If PostgreSQL is not connected, we'll still accept the comment but with a warning
    if (!postgresConnected) {
      console.warn('PostgreSQL not connected - comment will not be persisted');
      
      // Return success response even though it's not saved
      return res.status(201).json({
        comment_id,
        entry_id,
        comment_text,
        created_by,
        created_at: timestamp,
        updated_at: timestamp,
        warning: 'Comment accepted but not persisted due to database connectivity issues'
      });
    }
    
    // Get the client's comments table name - using case-insensitive comparison
    const tableResult = await pgPool.query(
      'SELECT comments_table_name FROM clients WHERE LOWER(client_name) = LOWER($1)',
      [client]
    );
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: `Client '${client}' not found` });
    }
    
    const commentsTableName = tableResult.rows[0].comments_table_name;
    
    // Insert comment into the client's comments table
    await pgPool.query(`
      INSERT INTO ${commentsTableName} (
        comment_id, entry_id, comment_text, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      comment_id, 
      entry_id, 
      comment_text, 
      created_by, 
      timestamp, 
      timestamp
    ]);
    
    res.status(201).json({
      comment_id,
      entry_id,
      comment_text,
      created_by,
      created_at: timestamp,
      updated_at: timestamp
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      message: 'Failed to add comment',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update comments endpoint with similar fallback behavior
app.patch('/api/financial-comments/:entry_id', async (req, res) => {
  try {
    const { entry_id } = req.params;
    const { comment_text, client } = req.body;
    
    if (!comment_text || !client) {
      return res.status(400).json({ message: 'Comment text and client are required' });
    }
    
    const comment_id = uuidv4();
    const timestamp = new Date();
    
    // If PostgreSQL is not connected, we'll still accept the comment update but with a warning
    if (!postgresConnected) {
      console.warn('PostgreSQL not connected - comment update will not be persisted');
      
      // Return success response even though it's not saved
      return res.status(200).json({
        comment_id,
        entry_id,
        comment_text,
        created_by: 'User',
        created_at: timestamp,
        updated_at: timestamp,
        warning: 'Comment update accepted but not persisted due to database connectivity issues'
      });
    }
    
    // Get the client's comments table name - using case-insensitive comparison
    const tableResult = await pgPool.query(
      'SELECT comments_table_name FROM clients WHERE LOWER(client_name) = LOWER($1)',
      [client]
    );
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: `Client '${client}' not found` });
    }
    
    const commentsTableName = tableResult.rows[0].comments_table_name;
    
    // Check if the comment exists
    const checkResult = await pgPool.query(
      `SELECT comment_id FROM ${commentsTableName} WHERE entry_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [entry_id]
    );
    
    if (checkResult.rows.length === 0) {
      // No existing comment, insert a new one
      await pgPool.query(`
        INSERT INTO ${commentsTableName} (
          comment_id, entry_id, comment_text, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        comment_id, 
        entry_id, 
        comment_text, 
        'User', // Default user if not provided on update
        timestamp, 
        timestamp
      ]);
      
      return res.status(201).json({
        comment_id,
        entry_id,
        comment_text,
        created_by: 'User',
        created_at: timestamp,
        updated_at: timestamp
      });
    }
    
    // Update existing comment by inserting a new version
    await pgPool.query(`
      INSERT INTO ${commentsTableName} (
        comment_id, entry_id, comment_text, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      comment_id, 
      entry_id, 
      comment_text, 
      'User', // Default user if not provided on update
      timestamp, 
      timestamp
    ]);
    
    res.status(200).json({
      comment_id,
      entry_id,
      comment_text,
      created_by: 'User',
      created_at: timestamp,
      updated_at: timestamp
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ 
      message: 'Failed to update comment',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Delete comments endpoint
app.delete('/api/financial-comments/:entry_id', async (req, res) => {
  try {
    const { entry_id } = req.params;
    const { client } = req.body;
    
    if (!client) {
      return res.status(400).json({ message: 'Client is required' });
    }
    
    // If PostgreSQL is not connected, we'll return an error
    if (!postgresConnected) {
      console.warn('PostgreSQL not connected - cannot delete comment');
      return res.status(503).json({ 
        message: 'Service unavailable',
        error: 'Database connection is not available'
      });
    }
    
    // Get the client's comments table name - using case-insensitive comparison
    const tableResult = await pgPool.query(
      'SELECT comments_table_name FROM clients WHERE LOWER(client_name) = LOWER($1)',
      [client]
    );
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ message: `Client '${client}' not found` });
    }
    
    const commentsTableName = tableResult.rows[0].comments_table_name;
    
    // Delete the comments for this entry_id
    const deleteResult = await pgPool.query(
      `DELETE FROM ${commentsTableName} WHERE entry_id = $1 RETURNING *`,
      [entry_id]
    );
    
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ 
        message: 'Comment not found',
        entry_id
      });
    }
    
    res.status(200).json({ 
      message: 'Comment deleted successfully',
      entry_id,
      deleted_count: deleteResult.rowCount
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      message: 'Failed to delete comment',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const userService = new UserService();
    
    // Use the verifyPassword method to check credentials
    const user = await userService.verifyPassword(email, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
    
    // Update last login
    await userService.updateUser(email, { last_login: new Date() });
    
    return res.json({
      token,
      user: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Token validation endpoint
app.get('/api/validate-token', authenticateToken, (req, res) => {
  res.json({ valid: true });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'up',
    postgresConnected,
    timestamp: new Date().toISOString()
  });
});

// Manual sync trigger endpoint
app.post('/api/trigger-sync', authenticateToken, async (req, res) => {
  try {
    // Always use force=true by default
    const { force = true } = req.body;
    
    console.log('Manually triggering synchronization from PostgreSQL to BigQuery...');
    
    // Run the sync with force=true by default
    await syncCommentsToBigQuery(force);
    console.log('Sync from PostgreSQL to BigQuery completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Synchronization to BigQuery triggered successfully',
      force: force, // Will almost always be true
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to trigger synchronization',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Setup credential files from environment variables
    setupCredentialFiles();
    
    // Initialize database
    const dbInitialized = await initializeDatabase();
    postgresConnected = dbInitialized; // Set the flag based on database initialization
    
    // Initialize user management
    await initializeUserManagement();
    
    // Start the sync scheduler
    await startSyncScheduler();
    
    // Try to start the server with multiple port attempts
    const tryPort = (port: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        const server = app.listen(port)
          .once('listening', () => {
            console.log(`Server is running on port ${port}`);
            console.log(`PostgreSQL connection status: ${postgresConnected ? 'Connected' : 'Disconnected'}`);
            resolve();
          })
          .once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`Port ${port} is busy, trying next port...`);
              server.close();
              // Try next port
              tryPort(port + 1).then(resolve).catch(reject);
            } else {
              reject(err);
            }
          });
      });
    };
    
    await tryPort(Number(port));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 