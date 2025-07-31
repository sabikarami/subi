#!/bin/bash

# V2Ray Config Tester - Deployment Script
# This script automates the deployment process for Cloudflare Workers

set -e  # Exit on any error

echo "🚀 Starting V2Ray Config Tester deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed!"
    print_status "Installing Wrangler CLI..."
    npm install -g wrangler
    print_success "Wrangler CLI installed successfully"
fi

# Check if user is logged in
print_status "Checking Wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
    print_warning "You are not logged in to Cloudflare"
    print_status "Please log in to your Cloudflare account..."
    wrangler auth login
fi

print_success "Authentication verified"

# Check if KV namespaces exist
print_status "Checking KV namespaces..."

# Create production KV namespace if it doesn't exist
print_status "Creating production KV namespace..."
PROD_KV_ID=$(wrangler kv:namespace create V2RAY_KV --preview false 2>/dev/null | grep -o 'id = "[^"]*"' | cut -d'"' -f2 || echo "")

if [ -z "$PROD_KV_ID" ]; then
    print_warning "Production KV namespace might already exist or there was an error"
    print_status "Please check your wrangler.toml file and update the KV namespace ID manually"
else
    print_success "Production KV namespace created with ID: $PROD_KV_ID"
fi

# Create preview KV namespace if it doesn't exist
print_status "Creating preview KV namespace..."
PREVIEW_KV_ID=$(wrangler kv:namespace create V2RAY_KV --preview 2>/dev/null | grep -o 'id = "[^"]*"' | cut -d'"' -f2 || echo "")

if [ -z "$PREVIEW_KV_ID" ]; then
    print_warning "Preview KV namespace might already exist or there was an error"
    print_status "Please check your wrangler.toml file and update the preview KV namespace ID manually"
else
    print_success "Preview KV namespace created with ID: $PREVIEW_KV_ID"
fi

# Update wrangler.toml with KV IDs if they were created
if [ ! -z "$PROD_KV_ID" ] && [ ! -z "$PREVIEW_KV_ID" ]; then
    print_status "Updating wrangler.toml with KV namespace IDs..."
    
    # Backup original wrangler.toml
    cp wrangler.toml wrangler.toml.backup
    
    # Update the IDs in wrangler.toml
    sed -i.tmp "s/id = \"your-kv-namespace-id\"/id = \"$PROD_KV_ID\"/" wrangler.toml
    sed -i.tmp "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$PREVIEW_KV_ID\"/" wrangler.toml
    
    # Remove temporary file
    rm wrangler.toml.tmp
    
    print_success "wrangler.toml updated with KV namespace IDs"
fi

# Validate wrangler.toml
print_status "Validating wrangler.toml configuration..."
if wrangler validate; then
    print_success "wrangler.toml configuration is valid"
else
    print_error "wrangler.toml configuration is invalid"
    print_status "Please check your configuration file"
    exit 1
fi

# Deploy to staging first (if staging environment exists)
if grep -q "\[env.staging\]" wrangler.toml; then
    print_status "Deploying to staging environment..."
    if wrangler deploy --env staging; then
        print_success "Successfully deployed to staging"
        
        # Get staging URL
        STAGING_URL=$(wrangler subdomain get 2>/dev/null || echo "your-subdomain")
        print_status "Staging URL: https://v2ray-config-tester-staging.$STAGING_URL.workers.dev"
        
        # Ask user if they want to continue to production
        echo ""
        read -p "Do you want to deploy to production? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Deployment stopped at staging"
            exit 0
        fi
    else
        print_error "Failed to deploy to staging"
        exit 1
    fi
fi

# Deploy to production
print_status "Deploying to production environment..."
if wrangler deploy; then
    print_success "Successfully deployed to production!"
    
    # Get production URL
    PROD_URL=$(wrangler subdomain get 2>/dev/null || echo "your-subdomain")
    print_success "Production URL: https://v2ray-config-tester.$PROD_URL.workers.dev"
    
    # Set up cron trigger
    print_status "Setting up cron trigger for automatic testing..."
    if wrangler triggers deploy; then
        print_success "Cron trigger deployed successfully"
        print_status "Automatic testing will run every 6 hours"
    else
        print_warning "Failed to deploy cron trigger - you may need to set it up manually"
    fi
    
else
    print_error "Failed to deploy to production"
    exit 1
fi

# Initialize some default KV values
print_status "Initializing default KV values..."

# Set initial values
wrangler kv:key put --binding V2RAY_KV "testing_active" "false" || print_warning "Failed to set testing_active"
wrangler kv:key put --binding V2RAY_KV "last_test_time" "0" || print_warning "Failed to set last_test_time"

print_success "Default KV values initialized"

# Display final information
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "  • Production URL: https://v2ray-config-tester.$PROD_URL.workers.dev"
if grep -q "\[env.staging\]" wrangler.toml; then
    echo "  • Staging URL: https://v2ray-config-tester-staging.$PROD_URL.workers.dev"
fi
echo "  • Automatic testing: Every 6 hours"
echo "  • KV Storage: Configured and ready"
echo ""
echo "🔧 Next steps:"
echo "  1. Visit your production URL to test the application"
echo "  2. Enter a V2Ray subdomain URL to start testing"
echo "  3. Monitor logs with: wrangler tail"
echo "  4. Check KV storage with: wrangler kv:key list --binding V2RAY_KV"
echo ""
echo "📚 For more information, check the README.md file"
echo ""
print_success "Happy testing! 🚀"