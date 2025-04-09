# Holistic Money Server

This is the backend server for the Holistic Money application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
DBT_CLIENT_DATASET=default_client
DBT_BIGQUERY_PROJECT=holistic-money
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
```

3. Initialize the database:
```bash
npm run init-user-management
```

This will:
- Create the necessary tables for user management
- Set up default roles (admin, manager, user)
- Create an admin user with the password specified in ADMIN_PASSWORD

## User Management

### Default Admin User
- Email: admin@example.com
- Password: The value specified in ADMIN_PASSWORD environment variable

### Roles
1. **Admin**
   - Full access to all clients and features
   - Can create and manage users
   - Can assign clients to users

2. **Manager**
   - Access to assigned clients
   - Can manage client data
   - Cannot create new users

3. **User**
   - Access to assigned clients only
   - Can view and interact with client data
   - Cannot manage users or clients

### API Endpoints

#### Authentication
- `POST /api/login`
  - Login with email and password
  - Returns JWT token and user info

#### User Management
- `POST /api/users`
  - Create a new user (admin only)
  - Required fields: email, password, role_name
  - Optional fields: first_name, last_name

#### Client Access
- `POST /api/users/:userEmail/clients/:clientName`
  - Assign a client to a user (admin only)
- `DELETE /api/users/:userEmail/clients/:clientName`
  - Remove client access from a user (admin only)
- `GET /api/users/:userEmail/clients/:clientName/access`
  - Check if a user has access to a client

## Development

1. Start the development server:
```bash
npm run dev
```

2. Build for production:
```bash
npm run build
```

3. Start the production server:
```bash
npm start
```

## Security Notes

1. Always use HTTPS in production
2. Set strong passwords for the admin user
3. Use a secure JWT_SECRET in production
4. Regularly rotate admin passwords
5. Monitor user activity and access patterns 