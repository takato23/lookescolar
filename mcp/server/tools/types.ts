import type { z } from 'zod';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

export type ToolResult = z.infer<typeof CallToolResultSchema>;

export interface ToolContext {
  signal: AbortSignal;
}

export interface ToolDefinition<Input = unknown> {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  parseInput: (value: unknown) => Input;
  handler: (input: Input, context: ToolContext) => Promise<ToolResult>;
}
