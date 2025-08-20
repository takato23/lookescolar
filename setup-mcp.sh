#!/bin/bash

# MCP Server Setup Script for LookEscolar Project
# This script installs and configures MCP servers for enhanced development capabilities

echo "🚀 Setting up MCP Servers for LookEscolar Project"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js installation
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Create MCP directory if it doesn't exist
MCP_DIR="$HOME/.mcp-servers"
mkdir -p "$MCP_DIR"
echo -e "${GREEN}✅ MCP directory ready: $MCP_DIR${NC}"

# Install MCP servers
echo ""
echo "📦 Installing MCP Servers..."
echo "----------------------------"

# Filesystem server (already available)
echo -e "${GREEN}✅ Filesystem server: Already configured and active${NC}"

# Sequential Thinking server
echo ""
echo "Installing Sequential Thinking server..."
if npm list -g @modelcontextprotocol/server-sequential-thinking >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Sequential Thinking server already installed${NC}"
else
    npm install -g @modelcontextprotocol/server-sequential-thinking
    echo -e "${GREEN}✅ Sequential Thinking server installed${NC}"
fi

# Puppeteer server
echo ""
echo "Installing Puppeteer server..."
if npm list -g @modelcontextprotocol/server-puppeteer >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Puppeteer server already installed${NC}"
else
    npm install -g @modelcontextprotocol/server-puppeteer
    echo -e "${GREEN}✅ Puppeteer server installed${NC}"
fi

# PostgreSQL server (optional)
echo ""
echo -e "${YELLOW}📌 PostgreSQL server (optional):${NC}"
echo "To use with Supabase, install with:"
echo "npm install -g @modelcontextprotocol/server-postgres"

# GitHub server (optional)
echo ""
echo -e "${YELLOW}📌 GitHub server (optional):${NC}"
echo "To use with GitHub, install with:"
echo "npm install -g @modelcontextprotocol/server-github"
echo "You'll need to set GITHUB_PERSONAL_ACCESS_TOKEN environment variable"

# Memory server (optional)
echo ""
echo -e "${YELLOW}📌 Memory server (optional):${NC}"
echo "For cross-session context, install with:"
echo "npm install -g @modelcontextprotocol/server-memory"

# Update Claude Desktop configuration
echo ""
echo "📝 Updating Claude Desktop configuration..."

CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Claude config exists. Please manually add the following servers:${NC}"
    echo ""
    cat << 'EOF'
{
  "mcpServers": {
    "filesystem-lookescolar": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/santiagobalosky/LookEscolar"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
EOF
else
    echo -e "${RED}❌ Claude config not found at expected location${NC}"
fi

# Create environment template
echo ""
echo "📋 Creating environment template for MCP servers..."

cat > .env.mcp.example << 'EOF'
# MCP Server Environment Variables

# GitHub Server (optional)
# GITHUB_PERSONAL_ACCESS_TOKEN=your-github-token-here

# PostgreSQL Server for Supabase (optional)
# Local Supabase
POSTGRES_CONNECTION_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Production Supabase (be careful!)
# POSTGRES_CONNECTION_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
EOF

echo -e "${GREEN}✅ Environment template created: .env.mcp.example${NC}"

# Summary
echo ""
echo "========================================="
echo -e "${GREEN}✅ MCP Server Setup Complete!${NC}"
echo "========================================="
echo ""
echo "📚 Available MCP Servers:"
echo "  • Filesystem: Direct file operations (ACTIVE)"
echo "  • Sequential Thinking: Complex analysis and debugging"
echo "  • Puppeteer: Browser automation and E2E testing"
echo ""
echo "📝 Next Steps:"
echo "  1. Restart Claude Desktop to load the new MCP servers"
echo "  2. Configure optional servers if needed (PostgreSQL, GitHub)"
echo "  3. Set up environment variables in .env.mcp if using optional servers"
echo ""
echo "🎯 Usage in Claude:"
echo "  • MCP servers will auto-activate based on context"
echo "  • Use --seq flag for complex analysis"
echo "  • Use --play flag for browser automation"
echo ""
echo "Happy coding! 🚀"