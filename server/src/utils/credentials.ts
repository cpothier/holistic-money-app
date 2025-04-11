import fs from 'fs';
import path from 'path';

// Directory to store credentials
const CREDENTIALS_DIR = path.join(__dirname, '..', '..', 'credentials');

/**
 * Ensures the credentials directory exists
 */
const ensureCredentialsDir = () => {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    try {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
      console.log(`Created credentials directory at ${CREDENTIALS_DIR}`);
    } catch (error) {
      console.error('Failed to create credentials directory:', error);
      throw error;
    }
  }
};

/**
 * Writes credential content from environment variables to files
 */
export const setupCredentialFiles = () => {
  console.log('Setting up credential files from environment variables...');
  
  ensureCredentialsDir();
  
  // Set up CA certificate for PostgreSQL SSL
  const CA_CERT_CONTENT = process.env.PG_CA_CERT_CONTENT;
  const CA_CERT_PATH = path.join(CREDENTIALS_DIR, 'ca.pem');
  
  if (CA_CERT_CONTENT) {
    try {
      fs.writeFileSync(CA_CERT_PATH, CA_CERT_CONTENT, 'utf8');
      console.log(`Successfully wrote CA certificate to ${CA_CERT_PATH}`);
    } catch (error) {
      console.error('Failed to write CA certificate:', error);
    }
  } else {
    console.warn('PG_CA_CERT_CONTENT environment variable not set, SSL certificate will not be available');
  }
  
  // Set up Google BigQuery service account
  const SERVICE_ACCOUNT_CONTENT = process.env.GOOGLE_APPLICATION_CREDENTIALS_CONTENT;
  const SERVICE_ACCOUNT_PATH = path.join(CREDENTIALS_DIR, 'service-account.json');
  
  if (SERVICE_ACCOUNT_CONTENT) {
    try {
      fs.writeFileSync(SERVICE_ACCOUNT_PATH, SERVICE_ACCOUNT_CONTENT, 'utf8');
      console.log(`Successfully wrote service account JSON to ${SERVICE_ACCOUNT_PATH}`);
    } catch (error) {
      console.error('Failed to write service account JSON:', error);
    }
  } else {
    console.warn('GOOGLE_APPLICATION_CREDENTIALS_CONTENT environment variable not set, BigQuery authentication will not be available');
  }
  
  return {
    caCertPath: CA_CERT_PATH,
    serviceAccountPath: SERVICE_ACCOUNT_PATH
  };
};

/**
 * Gets the path to credential files, ensuring they exist if environment variables are set
 */
export const getCredentialPaths = () => {
  ensureCredentialsDir();
  
  const caCertPath = path.join(CREDENTIALS_DIR, 'ca.pem');
  const serviceAccountPath = path.join(CREDENTIALS_DIR, 'service-account.json');
  
  return {
    caCertPath,
    serviceAccountPath
  };
}; 