import { pgPool } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Make sure to set this in production

export interface User {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    last_login: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface UserCreate {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    last_login?: Date;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export class UserService {
    // Create a new user
    async createUser(userData: UserCreate): Promise<User> {
        const { email, password, first_name, last_name, role } = userData;
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        
        const result = await pgPool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role_id)
             VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = $5))
             RETURNING *`,
            [email, passwordHash, first_name, last_name, role]
        );
        
        return result.rows[0];
    }

    // Authenticate user and return JWT token
    async login(email: string, password: string): Promise<LoginResponse> {
        const result = await pgPool.query(
            `SELECT u.user_id, u.email, u.password_hash, u.first_name, u.last_name, 
                    u.is_active, r.role_name
             FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.email = $1`,
            [email]
        );

        const user = result.rows[0];
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.is_active) {
            throw new Error('User account is inactive');
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid password');
        }

        // Update last login
        await pgPool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
            [user.user_id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: user.user_id,
                email: user.email,
                role: user.role_name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role_name,
                is_active: user.is_active,
                last_login: user.last_login,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        };
    }

    // Check if user has access to a client
    async checkClientAccess(userEmail: string, clientName: string): Promise<boolean> {
        // For demo purposes, allow access to all clients
        // In production, this should check the user_clients table
        return true;
        
        /* Production implementation:
        const result = await pgPool.query(
            `SELECT EXISTS (
                SELECT 1 FROM user_clients uc
                JOIN users u ON uc.user_id = u.user_id
                JOIN clients c ON uc.client_id = c.client_id
                WHERE u.email = $1 AND c.client_name = $2
            )`,
            [userEmail, clientName]
        );
        return result.rows[0].exists;
        */
    }

    // Assign a client to a user
    async assignClientToUser(userEmail: string, clientName: string): Promise<void> {
        await pgPool.query(
            `INSERT INTO user_clients (user_id, client_id)
             SELECT u.user_id, c.client_id
             FROM users u, clients c
             WHERE u.email = $1 AND c.client_name = $2`,
            [userEmail, clientName]
        );
    }

    // Remove client access from a user
    async removeClientAccess(userEmail: string, clientName: string): Promise<void> {
        await pgPool.query(
            `DELETE FROM user_clients uc
             USING users u, clients c
             WHERE uc.user_id = u.user_id
             AND uc.client_id = c.client_id
             AND u.email = $1
             AND c.client_name = $2`,
            [userEmail, clientName]
        );
    }

    // Get user by ID
    async getUserById(userId: string): Promise<User | null> {
        const result = await pgPool.query(
            `SELECT u.user_id, u.email, u.first_name, u.last_name, 
                    u.is_active, r.role_name
             FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return {
            user_id: result.rows[0].user_id,
            email: result.rows[0].email,
            first_name: result.rows[0].first_name,
            last_name: result.rows[0].last_name,
            role: result.rows[0].role_name,
            is_active: result.rows[0].is_active,
            last_login: result.rows[0].last_login,
            created_at: result.rows[0].created_at,
            updated_at: result.rows[0].updated_at
        };
    }

    async getAllUsers(): Promise<User[]> {
        const result = await pgPool.query(
            `SELECT u.*, r.role_name as role
             FROM users u
             JOIN roles r ON u.role_id = r.role_id`
        );
        return result.rows;
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const result = await pgPool.query(
            `SELECT u.*, r.role_name as role
             FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.email = $1`,
            [email]
        );
        return result.rows[0] || null;
    }

    async updateUser(email: string, userData: Partial<UserCreate>): Promise<User> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (userData.first_name) {
            updates.push(`first_name = $${paramCount}`);
            values.push(userData.first_name);
            paramCount++;
        }

        if (userData.last_name) {
            updates.push(`last_name = $${paramCount}`);
            values.push(userData.last_name);
            paramCount++;
        }

        if (userData.role) {
            updates.push(`role_id = (SELECT role_id FROM roles WHERE role_name = $${paramCount})`);
            values.push(userData.role);
            paramCount++;
        }

        if (userData.password) {
            const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
            updates.push(`password_hash = $${paramCount}`);
            values.push(passwordHash);
            paramCount++;
        }

        values.push(email);

        const result = await pgPool.query(
            `UPDATE users 
             SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE email = $${paramCount}
             RETURNING *`,
            values
        );

        return result.rows[0];
    }

    async deleteUser(email: string): Promise<void> {
        await pgPool.query('DELETE FROM users WHERE email = $1', [email]);
    }

    async verifyPassword(email: string, password: string): Promise<User | null> {
        // Special case for admin during development
        if (email === 'admin@holistic-money.com' && password === (process.env.ADMIN_PASSWORD || 'HolisticMoney2024!')) {
            console.log('Admin login detected - using direct authentication');
            
            // Try to get the admin user from the database
            const user = await this.getUserByEmail(email);
            
            // If found in database, return it
            if (user) {
                return user;
            }
            
            // Otherwise, create a temporary admin user object
            return {
                user_id: 'admin',
                email: 'admin@holistic-money.com',
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                is_active: true,
                last_login: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            };
        }
        
        // Normal database authentication
        const user = await this.getUserByEmail(email);
        
        if (!user) {
            return null;
        }
        
        // Get the password hash from the database
        const result = await pgPool.query(
            'SELECT password_hash FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const passwordHash = result.rows[0].password_hash;
        
        // Verify the password
        const isValid = await bcrypt.compare(password, passwordHash);
        
        if (!isValid) {
            return null;
        }
        
        return user;
    }
} 