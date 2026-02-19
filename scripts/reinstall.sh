#!/bin/bash
set -e
cd /vercel/share/v0-project

echo "Removing node_modules..."
rm -rf node_modules

echo "Removing package-lock.json..."
rm -f package-lock.json

echo "Running npm install to generate a fresh lock file..."
npm install

echo "Done! package-lock.json is now in sync with package.json."
