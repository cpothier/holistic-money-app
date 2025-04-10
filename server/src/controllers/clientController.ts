import { Request, Response } from 'express';
import { pgPool } from '../db';

export const getClients = async (req: Request, res: Response) => {
  try {
    // First check if the status column exists
    const columnCheck = await pgPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name = 'status'
    `);

    let query = 'SELECT * FROM clients ORDER BY client_name';
    let params: string[] = [];

    if (columnCheck.rows.length > 0) {
      // If status column exists, filter by active status
      query = 'SELECT * FROM clients WHERE status = $1 ORDER BY client_name';
      params = ['active'];
    }

    const clients = await pgPool.query(query, params);
    res.json(clients.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Error fetching clients' });
  }
};

export const addClient = async (req: Request, res: Response) => {
  try {
    const { client_name, bigquery_dataset, comments_table_name } = req.body;
    const result = await pgPool.query(
      'INSERT INTO clients (client_name, bigquery_dataset, comments_table_name) VALUES ($1, $2, $3) RETURNING *',
      [client_name, bigquery_dataset, comments_table_name]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ error: 'Error adding client' });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { client_name, bigquery_dataset, comments_table_name } = req.body;
    const result = await pgPool.query(
      'UPDATE clients SET client_name = $1, bigquery_dataset = $2, comments_table_name = $3 WHERE id = $4 RETURNING *',
      [client_name, bigquery_dataset, comments_table_name, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Error updating client' });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  const { clientId } = req.params;
  console.log('Attempting to delete client with ID:', clientId);
  
  try {
    // First verify the client exists
    const clientCheck = await pgPool.query('SELECT * FROM clients WHERE client_id = $1', [clientId]);
    if (clientCheck.rows.length === 0) {
      console.log('Client not found:', clientId);
      return res.status(404).json({ error: 'Client not found' });
    }

    // Begin a transaction
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      console.log('Transaction started');

      // Delete user-client associations first
      console.log('Deleting user-client associations');
      await client.query('DELETE FROM user_clients WHERE client_id = $1', [clientId]);

      // Delete the client
      console.log('Deleting client record');
      await client.query('DELETE FROM clients WHERE client_id = $1', [clientId]);

      await client.query('COMMIT');
      console.log('Transaction committed successfully');
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during transaction:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      error: 'Error deleting client',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 