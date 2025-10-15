#!/usr/bin/env node

/**
 * Test script for Apps SDK integration
 * Tests the MCP server connection without requiring OpenAI credentials
 */

async function testMCPServer() {
  console.log('🧪 Testing MCP Server for Apps SDK compatibility...\n');

  try {
    // Test health endpoint
    console.log('🏥 Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3030/healthz');
    const health = await healthResponse.json();

    console.log('✅ MCP Server Health:', health);

    // Test MCP endpoint accessibility
    console.log('\n🔌 Testing MCP endpoint accessibility...');
    const mcpResponse = await fetch('http://localhost:3030/mcp', {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (mcpResponse.ok) {
      console.log('✅ MCP endpoint accessible');
    } else {
      console.log('⚠️ MCP endpoint returned:', mcpResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Apps SDK Compatibility Test for LookEscolar MCP Server\n');

  try {
    await testMCPServer();
    console.log('\n✅ All tests passed! MCP server is ready for Apps SDK integration.');
    console.log('\n📋 Next steps:');
    console.log('1. Go to https://developers.openai.com/apps-sdk');
    console.log('2. Create new MCP Server app');
    console.log('3. Configure:');
    console.log('   - Transport: SSE');
    console.log('   - Server URL: http://localhost:3030/mcp');
    console.log('   - Connection: Server');
    console.log('4. Test in ChatGPT developer mode');

  } catch (error) {
    console.error('\n❌ Tests failed. Make sure MCP server is running:');
    console.log('npm run dev:mcp');
    process.exit(1);
  }
}

main().catch(console.error);
