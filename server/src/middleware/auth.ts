import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET = process.env.JWT_SECRET;

declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string;
                role: string;
            };
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        console.log('JWT Secret being used:', JWT_SECRET ? 'Set' : 'Not set');
        console.log('Token being verified:', token.substring(0, 10) + '...');
        
        const decoded = jwt.verify(token, JWT_SECRET) as {
            email: string;
            role: string;
        };
        
        console.log('Token successfully decoded:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        if (error instanceof jwt.JsonWebTokenError) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                expiredAt: (error as jwt.TokenExpiredError).expiredAt
            });
        }
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

export const checkClientAccess = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const clientName = req.query.client as string;
    if (!clientName) {
        return res.status(400).json({ error: 'Client name is required' });
    }

    const userService = new UserService();
    try {
        const hasAccess = await userService.checkClientAccess(req.user.email, clientName);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to this client' });
        }
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Error checking client access' });
    }
}; 