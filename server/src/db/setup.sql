-- Create clients table to store client information
CREATE TABLE IF NOT EXISTS clients (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL UNIQUE,
    bigquery_dataset TEXT NOT NULL,
    comments_table_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on client_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_client_name ON clients(client_name);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column for clients table
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to create a comments table for a new client
CREATE OR REPLACE FUNCTION create_client_comments_table(client_name TEXT, table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Create the comments table for this client
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            comment_id UUID PRIMARY KEY,
            entry_id TEXT NOT NULL,
            comment_text TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )', table_name);
    
    -- Create an index on entry_id for faster lookups
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_entry_id ON %I(entry_id)
    ', table_name, table_name);
    
    -- Create a trigger to update the updated_at column
    EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create a comments table when a new client is added
CREATE OR REPLACE FUNCTION create_client_comments_table_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_client_comments_table(NEW.client_name, NEW.comments_table_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS create_client_comments_table_trigger ON clients;
CREATE TRIGGER create_client_comments_table_trigger
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION create_client_comments_table_trigger();

-- Insert default client if it doesn't exist
INSERT INTO clients (client_name, bigquery_dataset, comments_table_name)
VALUES ('Austin Lifestyler', 'austin_lifestyler_marts', 'austin_lifestyler_comments')
ON CONFLICT (client_name) DO NOTHING; 