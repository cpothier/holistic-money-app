import express from 'express';
import { UserService, UserCreate } from '../services/userService';
import { authenticateToken, requireRole, checkClientAccess } from '../middleware/auth';

const router = express.Router();
const userService = new UserService();

// Create a new user (admin only)
router.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const userData: UserCreate = req.body;
        const user = await userService.createUser(userData);
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by email
router.get('/users/:email', authenticateToken, async (req, res) => {
    try {
        const { email } = req.params;
        const user = await userService.getUserByEmail(email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update user (admin only)
router.put('/users/:email', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { email } = req.params;
        const userData = req.body;
        const user = await userService.updateUser(email, userData);
        res.json(user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete user (admin only)
router.delete('/users/:email', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { email } = req.params;
        await userService.deleteUser(email);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await userService.login(email, password);
        res.json(response);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

// Assign client to user (admin only)
router.post('/users/:userEmail/clients/:clientName', 
    authenticateToken, 
    requireRole(['admin']), 
    async (req, res) => {
        try {
            const { userEmail, clientName } = req.params;
            await userService.assignClientToUser(userEmail, clientName);
            res.status(200).json({ message: 'Client assigned successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Remove client access from user (admin only)
router.delete('/users/:userEmail/clients/:clientName',
    authenticateToken,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const { userEmail, clientName } = req.params;
            await userService.removeClientAccess(userEmail, clientName);
            res.status(200).json({ message: 'Client access removed successfully' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Check client access
router.get('/users/:userEmail/clients/:clientName/access',
    authenticateToken,
    async (req, res) => {
        try {
            const { userEmail, clientName } = req.params;
            const hasAccess = await userService.checkClientAccess(userEmail, clientName);
            res.json({ hasAccess });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
);

export default router; 