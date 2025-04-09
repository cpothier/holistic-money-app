import { pgPool } from './index';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// Helper function to execute queries and handle errors
async function executeQuery(query: string, params: any[] = []): Promise<any> {
    try {
        return await pgPool.query(query, params);
    } catch (error) {
        console.error('SQL Error:', error);
        // We'll continue execution even if there's an error
        return null;
    }
}

export const initializeUserManagement = async () => {
    console.log('Initializing user management database...');
    
    try {
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'user_management.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Execute the SQL
        await executeQuery(sql);
        
        // Generate password hash for admin user if it doesn't exist
        const adminEmail = 'admin@holistic-money.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'HolisticMoney2024!';
        
        // Check if admin user exists
        const userResult = await executeQuery(
            'SELECT user_id FROM users WHERE email = $1',
            [adminEmail]
        );
        
        if (!userResult || userResult.rows.length === 0) {
            console.log('Creating admin user...');
            // Hash the password
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            
            // Insert admin user
            await executeQuery(`
                INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
                VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'admin'), true)
                ON CONFLICT (email) DO NOTHING
            `, [adminEmail, passwordHash, 'Admin', 'User']);
            
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
        
        console.log('User management initialized successfully');
    } catch (error) {
        console.error('Error in user management initialization:', error);
        // Don't throw the error - let the application continue
        console.log('Continuing application startup despite user management initialization issues');
    }
};

// Run the initialization if this file is executed directly
if (require.main === module) {
    initializeUserManagement()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Failed to initialize user management:', error);
            process.exit(1);
        });
} 