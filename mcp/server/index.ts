import 'dotenv/config';
import express from 'express';
import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getTool, listTools, toolDefinitions } from './tools/index.js';
import type { ToolResult } from './tools/types.js';

const PORT = Number(process.env.MCP_SERVER_PORT ?? 3030);
const HOST = process.env.MCP_SERVER_HOST ?? '0.0.0.0';
const APP_NAME = process.env.MCP_SERVER_NAME ?? 'lookescolar-mcp';
const APP_VERSION = process.env.MCP_SERVER_VERSION ?? '0.1.0';

interface SessionEntry {
  server: McpServer;
  transport: SSEServerTransport;
}

/**
 * Crea una instancia de MCP Server configurada con las herramientas disponibles.
 */
function createServer(): McpServer {
  const server = new McpServer(
    {
      name: APP_NAME,
      version: APP_VERSION,
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
      enforceStrictCapabilities: false,
    }
  );

  server.oninitialized = () => {
    console.info('[MCP] Sesión inicializada correctamente');
    void server.sendToolListChanged().catch((error) => {
      console.warn('[MCP] No se pudo notificar cambio de herramientas:', error);
    });
  };

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const { cursor } = request.params ?? {};
    if (cursor) {
      // Paginación simple: no soportada actualmente
      return {
        tools: [],
      };
    }

    return {
      tools: listTools(),
    };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request, { signal }): Promise<ToolResult> => {
      const toolName = request.params.name;
      const tool = getTool(toolName);

      if (!tool) {
        return {
          content: [
            {
              type: 'text',
              text: `Herramienta desconocida: ${toolName}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const parsedInput = tool.parseInput(request.params.arguments ?? {});
        return await tool.handler(parsedInput, { signal });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : 'Error desconocido';
        console.error(`[MCP] Error ejecutando ${toolName}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Falló la herramienta ${toolName}: ${description}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Notificar lista disponible al arrancar
  void server
    .sendToolListChanged()
    .catch((error) =>
      console.warn('[MCP] Error al emitir lista inicial de tools:', error)
    );

  return server;
}

const app = express();
const sessions = new Map<string, SessionEntry>();

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    tools: toolDefinitions.length,
  });
});

app.get('/mcp', async (req, res) => {
  try {
    const server = createServer();
    const transport = new SSEServerTransport('/mcp/messages', res);

    transport.onclose = () => {
      sessions.delete(transport.sessionId);
      void server.close();
      console.info(`[MCP] Sesión ${transport.sessionId} cerrada`);
    };

    transport.onerror = (error) => {
      console.error(`[MCP] Error en transporte SSE:`, error);
    };

    sessions.set(transport.sessionId, { server, transport });
    await server.connect(transport);
    console.info(`[MCP] Nueva sesión ${transport.sessionId} registrada`);
  } catch (error) {
    console.error('[MCP] Error al inicializar la sesión:', error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: 'No se pudo iniciar la sesión MCP', details: String(error) });
    }
  }
});

app.post(
  '/mcp/messages',
  express.json({ limit: '4mb' }),
  async (req, res): Promise<void> => {
    const sessionId = String(req.query.sessionId ?? '');
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId es requerido' });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: `Sesión ${sessionId} no encontrada` });
      return;
    }

    try {
      await session.transport.handleMessage(req.body);
      res.status(202).json({ accepted: true });
    } catch (error) {
      console.error('[MCP] Error procesando mensaje:', error);
      res
        .status(400)
        .json({ error: 'Mensaje inválido', details: error instanceof Error ? error.message : String(error) });
    }
  }
);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, HOST, () => {
  console.info(
    `[MCP] Servidor ${APP_NAME}@${APP_VERSION} escuchando en http://${HOST}:${PORT}`
  );
});
