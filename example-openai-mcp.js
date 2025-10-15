#!/usr/bin/env node

/**
 * Example: Using MCP tools with OpenAI SDK
 *
 * This script demonstrates how to integrate LookEscolar MCP tools
 * with OpenAI conversations, allowing AI assistants to interact
 * with the order management system.
 */

import { MCPClient } from './mcp-client-openai.ts';

async function main() {
  // Make sure you have OPENAI_API_KEY in your environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Use ngrok URL if provided, otherwise localhost
  const mcpUrl = process.env.MCP_URL || 'http://localhost:3030/mcp';
  console.log(`🔗 Connecting to MCP server at: ${mcpUrl}`);

  const client = new MCPClient(process.env.OPENAI_API_KEY, mcpUrl);

  try {
    console.log('🔌 Connecting to MCP server...');
    await client.connect();

    console.log('\n📝 Example 1: Checking workflow agenda');
    const response1 = await client.chatWithTools([
      {
        role: 'user',
        content: '¿Qué pedidos requieren atención hoy? Revisa la agenda de workflows.'
      }
    ]);
    console.log('🤖', response1);

    console.log('\n📝 Example 2: Simulating workflow for a specific order');
    const response2 = await client.chatWithTools([
      {
        role: 'user',
        content: 'Simula qué workflows se ejecutarían si un pedido cambia a estado "approved"'
      }
    ]);
    console.log('🤖', response2);

    console.log('\n📝 Example 3: Direct tool call - list orders');
    const orders = await client.callTool('consultar_pedidos', {});
    console.log('📊 Orders result:', JSON.stringify(orders, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting...');
    await client.disconnect();
  }
}

main().catch(console.error);
