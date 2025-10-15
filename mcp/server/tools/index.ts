import { buscarFotosTool } from './buscar-fotos.js';
import { aprobarFotosTool } from './aprobar-fotos.js';
import { moverFotosTool } from './mover-fotos.js';
import { generarUrlsFotosTool } from './generar-urls-fotos.js';
import { crearCarpetaTool } from './crear-carpeta.js';
import { listarCarpetasTool } from './listar-carpetas.js';
import { crearPaqueteTool } from './crear-paquete.js';
import { consultarPedidosTool } from './consultar-pedidos.js';
import { estadisticasVentasTool } from './estadisticas-ventas.js';
import { actualizarPedidoTool } from './actualizar-pedido.js';
import { resumenPedidosTool } from './resumen-pedidos.js';
import { clasificarFotosTool } from './clasificar-fotos.js';
import { autoClasificarEventoTool } from './auto-clasificar-evento.js';
import { analyticsEventInsightsTool } from './analytics-event-insights.js';
import { qrBatchStatusTool } from './qr-batch-status.js';
import { ordersFollowUpTool } from './orders-follow-up.js';
import { storeThemePreviewTool } from './store-theme-preview.js';
import { listarWorkflowsTool } from './listar-workflows.js';
import { agendaWorkflowTool } from './agenda-workflow.js';
import { dispararWorkflowTool } from './disparar-workflow.js';
import { simularWorkflowTool } from './simular-workflow.js';
import { listarPedidosTool } from './listar-pedidos.js';
import type { ToolDefinition } from './types.js';

export const toolDefinitions: ToolDefinition[] = [
  buscarFotosTool,
  aprobarFotosTool,
  moverFotosTool,
  generarUrlsFotosTool,
  crearCarpetaTool,
  listarCarpetasTool,
  clasificarFotosTool,
  autoClasificarEventoTool,
  crearPaqueteTool,
  consultarPedidosTool,
  estadisticasVentasTool,
  actualizarPedidoTool,
  resumenPedidosTool,
  analyticsEventInsightsTool,
  qrBatchStatusTool,
  ordersFollowUpTool,
  storeThemePreviewTool,
  listarWorkflowsTool,
  agendaWorkflowTool,
  dispararWorkflowTool,
  simularWorkflowTool,
  listarPedidosTool,
];

const toolMap = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

export function listTools() {
  return toolDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  }));
}

export function getTool(name: string) {
  return toolMap.get(name);
}
