-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Check if the update_updated_at_column function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
    ) THEN
        -- Create the function if it doesn't exist
        EXECUTE $func$
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $BODY$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $BODY$ LANGUAGE plpgsql
        $func$;
    END IF;
END
$$;

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_roles_updated_at'
    ) THEN
        EXECUTE 'CREATE TRIGGER update_roles_updated_at
                BEFORE UPDATE ON roles
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        EXECUTE 'CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()';
    END IF;
END
$$;

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
    ('admin', 'Full system access'),
    ('manager', 'Can manage clients and view all data'),
    ('user', 'Can view assigned clients data')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default admin user
-- Password hash for 'admin123'
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
VALUES (
    'admin@holistic-money.com', 
    '$2b$10$3wIKaRZ.yBN9VXM1/AoKnuBtwJ1McpUcUs7V8IJbSZJf7vA0jBjXS', -- hash for 'admin123'
    'Admin',
    'User',
    (SELECT role_id FROM roles WHERE role_name = 'admin'),
    true
)
ON CONFLICT (email) DO NOTHING;

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