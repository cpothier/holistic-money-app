#!/bin/bash

# Output debug info
echo "=== Build Environment ==="
node -v
npm -v
echo "Working directory: $(pwd)"
echo "=============================="

# Clean build directory and node_modules if they exist
if [ -d "build" ]; then
  echo "Removing existing build directory..."
  rm -rf build
fi

if [ -d "node_modules/.cache" ]; then
  echo "Cleaning build cache..."
  rm -rf node_modules/.cache
fi

# Create public/build-info.txt with build information
BUILD_INFO="Build timestamp: $(date)
Node version: $(node -v)
NPM version: $(npm -v)
Git commit: $(git rev-parse HEAD)
"
echo "$BUILD_INFO" > public/build-info.txt
echo "Created build-info.txt with build details"

# Run build with verbose output
echo "Starting production build..."
GENERATE_SOURCEMAP=false CI=false npm run build

# Verify build contents
if [ -d "build" ]; then
  echo "=== Build Complete ==="
  echo "Files in build directory:"
  ls -la build
  echo "Static files:"
  ls -la build/static 2>/dev/null || echo "No static directory found!"
  
  # Copy fallback and test HTML to build root
  echo "Copying fallback HTML files to build root..."
  cp public/index-override.html build/ 2>/dev/null || echo "Warning: index-override.html not copied"
  cp public/index-fallback.html build/ 2>/dev/null || echo "Warning: index-fallback.html not copied"
  cp public/index-simple.html build/ 2>/dev/null || echo "Warning: index-simple.html not copied"
  cp public/index-direct.html build/ 2>/dev/null || echo "Warning: index-direct.html not copied"
  cp public/test.html build/ 2>/dev/null || echo "Warning: test.html not copied"
  cp public/_redirects build/ 2>/dev/null || echo "Warning: _redirects not copied"
  
  # Create a simple HTML test file in the build directory
  echo "Creating emergency.html in build directory..."
  cat > build/emergency.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Holistic Money - Emergency Page</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #FFA48A; }
    .btn { display: inline-block; background: #FFA48A; color: white; padding: 10px 20px; 
           margin: 10px 0; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Holistic Money - Emergency Page</h1>
  <p>This is a static emergency page. If you're seeing this, it means the application is experiencing technical difficulties.</p>
  <div>
    <a class="btn" href="/test.html">Test API Connection</a>
  </div>
  <hr>
  <div id="debug">
    <h3>Debug Info:</h3>
    <pre id="debug-info">URL: </pre>
  </div>
  <script>
    document.getElementById('debug-info').textContent += window.location.href;
  </script>
</body>
</html>
EOF

  echo "Build process completed."
else
  echo "ERROR: Build directory not created. Build failed!"
  exit 1
fi 