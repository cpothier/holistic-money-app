import dotenv from 'dotenv';
import { initializeUserManagement } from '../src/db/initUserManagement';

// Load environment variables
dotenv.config();

async function main() {
    try {
        await initializeUserManagement();
        console.log('User management initialization completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to initialize user management:', error);
        process.exit(1);
    }
}

main(); 