#!/bin/bash

# Directory for the proxy
PROXY_DIR="./cloud-sql-proxy"
mkdir -p $PROXY_DIR

# Download the Cloud SQL Auth Proxy if it doesn't exist
if [ ! -f "$PROXY_DIR/cloud-sql-proxy" ]; then
    echo "Downloading Cloud SQL Auth Proxy..."
    curl -o $PROXY_DIR/cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.1/cloud-sql-proxy.darwin.amd64
    chmod +x $PROXY_DIR/cloud-sql-proxy
    echo "Download complete."
fi

# Get the instance connection name - you need to replace this with your actual instance connection name
# Format: PROJECT_ID:REGION:INSTANCE_NAME
INSTANCE_CONNECTION_NAME="holistic-money:us-central1:holistic-money-postgresql"

# Path to service account credentials file
CREDENTIALS_FILE="./credentials/service-account.json"

# Run the proxy
echo "Starting Cloud SQL Auth Proxy..."
echo "Instance: $INSTANCE_CONNECTION_NAME"
echo "Credentials: $CREDENTIALS_FILE"

$PROXY_DIR/cloud-sql-proxy --instances=$INSTANCE_CONNECTION_NAME=tcp:5432 --credential-file=$CREDENTIALS_FILE 