# Holistic Money App

A frontend application that connects to a BigQuery data warehouse to display financial data and allow accountants to add notes to line items.

## Project Structure

- `/holistic-money-app` - React frontend application
- `/server` - Express.js backend with:
  - BigQuery connection for financial data
  - PostgreSQL for storing and managing comments
  - Scheduled sync service to keep BigQuery updated

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Google Cloud account with access to BigQuery
- Service account credentials with BigQuery access
- PostgreSQL database server (v12+)

## Setup Instructions

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will run on http://localhost:3000

### 2. PostgreSQL Setup

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a new database:

```sql
CREATE DATABASE holistic_money;
```

3. The application will automatically create the necessary tables on first run.

### 3. Backend Setup

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env
```

Edit the `.env` file with your credentials:

```
PORT=3001
NODE_ENV=development

# BigQuery Configuration
PROJECT_ID=holistic-money
DATASET_ID=austin_lifestyler_marts
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json

# PostgreSQL Configuration
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=holistic_money
PG_USER=postgres
PG_PASSWORD=your_password

# Sync Configuration
SYNC_ENABLED=true
SYNC_FREQUENCY=60 # minutes

# API Configuration
CORS_ORIGIN=http://localhost:3000
```

Start the backend server:

```bash
# Start in development mode
npm run dev

# Or build and start in production mode
npm run build
npm start
```

The backend API will run on http://localhost:3001

## Data Architecture

This application uses a hybrid database approach:

1. **PostgreSQL** for storing and managing comments
   - Provides full CRUD operations for comments
   - Optimized for transactional workloads

2. **BigQuery** for financial data and reporting
   - Stores all financial data (p&l, budget, etc.)
   - Comments are synced from PostgreSQL for reporting purposes
   - Optimized for analytical workloads

3. **Sync Process**
   - Automatically syncs comments from PostgreSQL to BigQuery
   - Can be configured to run at different intervals
   - Ensures BI dashboards have up-to-date comment data

## Features

- View financial data with actual vs budget comparison
- Filter data by month
- Add and edit comments on line items
- Color-coded variance indicators

## Manual Sync Process

The sync process can be triggered manually in several ways:

### 1. Using the Test Script

The easiest way to test the sync process is using the test script:

```bash
# Navigate to the server directory
cd server

# Run the test sync script
npx ts-node src/test-sync.ts
```

This script will:
- Check the configuration for a specific client (bb_design by default)
- Count comments in PostgreSQL
- Run the sync process for all clients
- Verify the results in BigQuery

### 2. Using the API Endpoint

You can also trigger the sync via the API:

```bash
# Using curl
curl -X POST http://localhost:3001/api/sync

# Or using the frontend application
# Navigate to the admin section and click "Trigger Sync"
```

### 3. Scheduled Sync

The sync process runs automatically based on the `SYNC_FREQUENCY` setting in your `.env` file:

```
SYNC_ENABLED=true
SYNC_FREQUENCY=60 # minutes
```

You can also enable sync on startup:

```
SYNC_ON_STARTUP=true
```

### Sync Process Details

The sync process:
1. Creates a temporary table in BigQuery
2. Inserts all comments from PostgreSQL
3. Verifies the record count
4. Replaces the main table with the temporary table
5. Creates/updates a view for the latest comments
6. Logs detailed progress and results

To monitor the sync process, check the server logs or use the test script for detailed output.

## Deployment

### Prerequisites

1. Install required tools:
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Install Heroku CLI
   brew tap heroku/brew && brew install heroku
   ```

2. Login to services:
   ```bash
   # Login to Vercel
   vercel login

   # Login to Heroku
   heroku login
   ```

### Automated Deployment

The easiest way to deploy is using the provided deployment script:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh <frontend-domain> <backend-domain>
```

Example:
```bash
./deploy.sh holistic-money-app.vercel.app holistic-money-api.herokuapp.com
```

### Manual Deployment

#### Frontend (Vercel)

1. Navigate to the frontend directory:
   ```bash
   cd holistic-money-app
   ```

2. Create a production environment file:
   ```bash
   echo "REACT_APP_API_URL=https://your-backend-domain.herokuapp.com" > .env.production
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

#### Backend (Heroku)

1. Navigate to the backend directory:
   ```bash
   cd server
   ```

2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```

3. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://your-frontend-domain.vercel.app
   heroku config:set PROJECT_ID=holistic-money
   heroku config:set PG_HOST=your-db-host
   heroku config:set PG_PORT=your-db-port
   heroku config:set PG_DATABASE=your-db-name
   heroku config:set PG_USER=your-db-user
   heroku config:set PG_PASSWORD=your-db-password
   heroku config:set PG_SSL=true
   heroku config:set SYNC_ENABLED=true
   heroku config:set SYNC_FREQUENCY=60
   heroku config:set SYNC_ON_STARTUP=true
   heroku config:set ADMIN_PASSWORD=your-admin-password
   heroku config:set JWT_SECRET=your-jwt-secret
   ```

4. Deploy to Heroku:
   ```bash
   git push heroku main
   ```

### Post-Deployment

1. Verify the deployment:
   - Frontend should be accessible at: https://your-frontend-domain.vercel.app
   - Backend API should be accessible at: https://your-backend-domain.herokuapp.com/api/health

2. Test the sync process:
   ```bash
   curl -X POST https://your-backend-domain.herokuapp.com/api/sync
   ```

3. Monitor the application:
   - Vercel dashboard: https://vercel.com/dashboard
   - Heroku dashboard: https://dashboard.heroku.com/apps

### Troubleshooting

1. If the frontend can't connect to the backend:
   - Check CORS settings in the backend
   - Verify the API URL in frontend environment variables
   - Check network requests in browser developer tools

2. If the sync process fails:
   - Check Heroku logs: `heroku logs --tail`
   - Verify database connection settings
   - Check BigQuery credentials

3. If the application is slow:
   - Check Heroku dyno metrics
   - Verify database connection pooling
   - Consider upgrading Heroku dyno size
