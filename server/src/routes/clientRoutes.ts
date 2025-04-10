import express from 'express';
import { getClients, addClient, deleteClient } from '../controllers/clientController';

const router = express.Router();

// Get all clients
router.get('/', getClients);

// Add a new client
router.post('/', addClient);

// Delete a client
router.delete('/:clientId', deleteClient);

export default router; 