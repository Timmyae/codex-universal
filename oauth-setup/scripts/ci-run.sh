#!/bin/bash

# Enhanced error handling
set -e

# Check if package-lock.json exists and simplify npm dependency installation logic
if [ -f package-lock.json ]; then
    echo "package-lock.json found. Running 'npm ci'."
    npm ci
else
    echo "package-lock.json not found. Falling back to 'npm install'."
    npm install
fi

# Add any other script logic here if necessary