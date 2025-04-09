-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role_id UUID REFERENCES roles(role_id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_clients table for many-to-many relationship between users and clients
CREATE TABLE IF NOT EXISTS user_clients (
    user_id UUID REFERENCES users(user_id),
    client_id UUID REFERENCES clients(client_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, client_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_user ON user_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clients_client ON user_clients(client_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Create triggers for updated_at
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
    ('admin', 'Full system access'),
    ('manager', 'Can manage clients and view all data'),
    ('user', 'Can view assigned clients data')
ON CONFLICT (role_name) DO NOTHING;

-- Create function to check if a user has access to a client
CREATE OR REPLACE FUNCTION check_user_client_access(user_email TEXT, client_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    -- Check if user is admin (has access to all clients)
    SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.email = user_email AND r.role_name = 'admin'
    ) INTO has_access;

    IF has_access THEN
        RETURN true;
    END IF;

    -- Check if user has specific access to the client
    SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN user_clients uc ON u.user_id = uc.user_id
        JOIN clients c ON uc.client_id = c.client_id
        WHERE u.email = user_email AND c.client_name = client_name
    ) INTO has_access;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Create admin user if it doesn't exist
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
SELECT 
    'admin@example.com',
    '$2b$10$rPQcT3UZw1UxX5Ux5Ux5Ux5Ux5Ux5Ux5Ux5Ux5Ux5Ux5Ux5Ux5U', -- Change this to a proper hashed password
    'Admin',
    'User',
    r.role_id,
    true
FROM roles r
WHERE r.role_name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@example.com'
); 