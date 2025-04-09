import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Creates a JWT token for admin
function createAdminToken() {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(
    { email: 'admin@holistic-money.com', role: 'admin' },
    secret,
    { expiresIn: '1h' }
  );
}

// Test the manual sync trigger
async function testManualSync() {
  try {
    console.log('🔄 Testing manual sync trigger...');
    
    // Create an admin token
    const token = createAdminToken();
    console.log('✅ Created admin token');
    
    // Define the API endpoint
    const apiUrl = 'http://localhost:3001/api/trigger-sync';
    
    // Make the request
    console.log(`🚀 Sending POST request to ${apiUrl}`);
    const response = await axios.post(
      apiUrl,
      { force: true }, // Always force refresh to avoid duplicates
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log the response
    console.log('✅ Sync triggered successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Error triggering sync:', error.message);
    } else if (axios.isAxiosError(error) && error.response) {
      console.error('❌ Error triggering sync:', error.response.data);
    } else {
      console.error('❌ Error triggering sync:', String(error));
    }
  }
}

// Run the test
testManualSync(); 