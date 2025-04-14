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
      // Check if the content is already in JSON format or needs to be parsed
      let formattedContent = SERVICE_ACCOUNT_CONTENT;
      
      // Try to parse the JSON content to ensure it's properly formatted
      try {
        const parsed = JSON.parse(SERVICE_ACCOUNT_CONTENT);
        // Pretty print JSON for better readability in case of inspection
        formattedContent = JSON.stringify(parsed, null, 2);
        console.log('Successfully validated Google credentials JSON format');
      } catch (jsonError) {
        console.warn('Service account content is not valid JSON, will write as-is:', jsonError);
      }
      
      fs.writeFileSync(SERVICE_ACCOUNT_PATH, formattedContent, 'utf8');
      console.log(`Successfully wrote service account JSON to ${SERVICE_ACCOUNT_PATH}`);
      
      // Set the environment variable to point to this file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;
      console.log(`Set GOOGLE_APPLICATION_CREDENTIALS environment variable to ${SERVICE_ACCOUNT_PATH}`);
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
  
  // Double-check if service account file exists and is readable
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const content = fs.readFileSync(serviceAccountPath, 'utf8');
      JSON.parse(content); // Validate JSON
      // Set environment variable to this file path for libraries that rely on it
      process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
    } catch (error) {
      console.error(`Service account file exists but is not valid JSON: ${serviceAccountPath}`, error);
    }
  }
  
  return {
    caCertPath,
    serviceAccountPath
  };
}; 