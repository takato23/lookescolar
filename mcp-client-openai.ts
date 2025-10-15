// @ts-nocheck
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import OpenAI from 'openai';

// MCP Client for OpenAI integration
class MCPClient {
  private client: Client;
  private transport: SSEClientTransport;
  private openai: OpenAI;
  private tools: any[] = [];

  constructor(openaiApiKey: string, mcpUrl: string = 'http://localhost:3030/mcp') {
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    this.client = new Client(
      {
        name: 'lookescolar-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    this.transport = new SSEClientTransport(
      new URL(mcpUrl)
    );
  }

  async connect() {
    await this.client.connect(this.transport);
    console.log('✅ Connected to MCP server');

    // Get available tools
    const toolsResponse = await this.client.request(
      { method: 'tools/list', params: {} },
      { timeout: 10000 }
    );

    this.tools = toolsResponse.tools || [];
    console.log(`📋 Available tools: ${this.tools.length}`);
    console.log(this.tools.map(t => t.name).join(', '));
  }

  async callTool(toolName: string, args: any = {}) {
    try {
      const response = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        },
        { timeout: 30000 }
      );

      return response;
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  async chatWithTools(messages: any[]) {
    // Convert MCP tools to OpenAI function format
    const openaiTools = this.tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: openaiTools,
      tool_choice: 'auto',
    });

    const message = response.choices[0]?.message;

    if (message?.tool_calls) {
      // Execute MCP tools
      const toolResults = [];
      for (const toolCall of message.tool_calls) {
        try {
          const result = await this.callTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(result),
          });
        } catch (error) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: `Error: ${error.message}`,
          });
        }
      }

      // Get final response with tool results
      const finalResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          ...messages,
          message,
          ...toolResults,
        ],
      });

      return finalResponse.choices[0]?.message?.content;
    }

    return message?.content;
  }

  async disconnect() {
    await this.client.close();
  }
}

// Example usage
async function main() {
  const client = new MCPClient(process.env.OPENAI_API_KEY!);

  try {
    await client.connect();

    // Example conversation
    const messages = [
      {
        role: 'user',
        content: '¿Qué pedidos requieren atención hoy? Revisa la agenda de workflows.'
      }
    ];

    const response = await client.chatWithTools(messages);
    console.log('🤖 Response:', response);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MCPClient };
