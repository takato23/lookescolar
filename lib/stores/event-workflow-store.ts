/**
 * Holistic Event State Detection System
 * iOS 18 Liquid Glass Event Management
 *
 * This system provides intelligent workflow automation and state management
 * for the event management interface, replacing fragmented tabs with
 * contextual, interconnected workflows.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ===========================================
// EVENT LIFECYCLE STATES
// ===========================================

export enum EventPhase {
  SETUP = 'setup',
  CONTENT_UPLOAD = 'content_upload',
  ORGANIZATION = 'organization',
  PUBLISHING = 'publishing',
  ACTIVE_SALES = 'active_sales',
  FULFILLMENT = 'fulfillment',
  COMPLETED = 'completed',
}

export enum WorkflowPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  OPTIONAL = 'optional',
}

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface EventMetrics {
  totalPhotos: number;
  taggedPhotos: number;
  untaggedPhotos: number;
  totalSubjects: number;
  activeTokens: number;
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  conversionRate: number;
  engagementRate: number;
  qualityScore: number;
  completionPercentage: number;
}

export interface WorkflowAction {
  id: string;
  type:
    | 'upload'
    | 'tag'
    | 'publish'
    | 'organize'
    | 'review'
    | 'export'
    | 'notify';
  title: string;
  description: string;
  priority: WorkflowPriority;
  estimatedTime: number; // in minutes
  dependencies: string[];
  automatable: boolean;
  aiSuggestion?: string;
  icon: string;
  color: string;
  progress?: number;
}

export interface QualityIssue {
  id: string;
  type:
    | 'missing_photos'
    | 'untagged_content'
    | 'low_engagement'
    | 'incomplete_setup'
    | 'technical_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  resolution: string;
  autoFixable: boolean;
  affectedComponents: string[];
  category?: 'photos' | 'data' | 'system' | 'user_experience';
  timestamp?: string;
  actionRequired?: boolean;
}

export interface SmartSuggestion {
  id: string;
  type: 'optimization' | 'automation' | 'engagement' | 'revenue' | 'workflow';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  action: () => void;
}

export interface EventState {
  // Core Data
  eventId: string;
  eventInfo: any;
  metrics: EventMetrics;

  // Workflow State
  currentPhase: EventPhase;
  workflowActions: WorkflowAction[];
  completedActions: string[];
  nextActions: WorkflowAction[];
  blockers: QualityIssue[];

  // Intelligence
  smartSuggestions: SmartSuggestion[];
  automationRules: any[];
  qualityIssues: QualityIssue[];

  // UI State
  activeView: 'dashboard' | 'photos' | 'students' | 'orders' | 'analytics';
  contextualPanel: string | null;
  notificationQueue: any[];

  // Real-time sync
  lastUpdated: Date;
  syncStatus: 'synced' | 'syncing' | 'error';
}

// ===========================================
// WORKFLOW DETECTION ENGINE
// ===========================================

export class WorkflowDetector {
  static detectEventPhase(metrics: EventMetrics, eventInfo: any): EventPhase {
    // Setup phase detection
    if (metrics.totalSubjects === 0 && metrics.totalPhotos === 0) {
      return EventPhase.SETUP;
    }

    // Content upload phase
    if (
      metrics.totalPhotos < 50 ||
      metrics.untaggedPhotos > metrics.totalPhotos * 0.8
    ) {
      return EventPhase.CONTENT_UPLOAD;
    }

    // Organization phase
    if (
      metrics.untaggedPhotos > metrics.totalPhotos * 0.3 ||
      metrics.activeTokens === 0
    ) {
      return EventPhase.ORGANIZATION;
    }

    // Publishing phase
    if (!eventInfo.published || metrics.engagementRate === 0) {
      return EventPhase.PUBLISHING;
    }

    // Active sales phase
    if (
      metrics.totalOrders < metrics.totalSubjects * 0.3 &&
      metrics.engagementRate > 0
    ) {
      return EventPhase.ACTIVE_SALES;
    }

    // Fulfillment phase
    if (metrics.pendingOrders > 0) {
      return EventPhase.FULFILLMENT;
    }

    return EventPhase.COMPLETED;
  }

  static generateNextActions(
    phase: EventPhase,
    metrics: EventMetrics,
    eventInfo: any
  ): WorkflowAction[] {
    const actions: WorkflowAction[] = [];

    switch (phase) {
      case EventPhase.SETUP:
        actions.push({
          id: 'setup-students',
          type: 'organize',
          title: 'Agregar Estudiantes',
          description:
            'Importa la lista de estudiantes desde CSV o agrega manualmente',
          priority: WorkflowPriority.CRITICAL,
          estimatedTime: 15,
          dependencies: [],
          automatable: true,
          icon: 'Users',
          color: 'blue',
          aiSuggestion: 'Usa la plantilla CSV para importar más rápido',
        });
        break;

      case EventPhase.CONTENT_UPLOAD:
        if (metrics.totalPhotos === 0) {
          actions.push({
            id: 'upload-photos',
            type: 'upload',
            title: 'Subir Fotos',
            description: 'Carga las fotos del evento en lotes',
            priority: WorkflowPriority.CRITICAL,
            estimatedTime: 30,
            dependencies: [],
            automatable: false,
            icon: 'Camera',
            color: 'green',
          });
        }

        if (metrics.untaggedPhotos > 10) {
          actions.push({
            id: 'bulk-tag-photos',
            type: 'tag',
            title: 'Etiquetar Fotos',
            description: `${metrics.untaggedPhotos} fotos necesitan etiquetas`,
            priority: WorkflowPriority.HIGH,
            estimatedTime: Math.ceil(metrics.untaggedPhotos / 20),
            dependencies: ['upload-photos'],
            automatable: true,
            icon: 'Tag',
            color: 'orange',
            aiSuggestion:
              'IA puede sugerir etiquetas basadas en reconocimiento facial',
          });
        }
        break;

      case EventPhase.ORGANIZATION:
        if (metrics.activeTokens === 0) {
          actions.push({
            id: 'generate-tokens',
            type: 'organize',
            title: 'Generar Tokens',
            description: 'Crea tokens de acceso para las familias',
            priority: WorkflowPriority.HIGH,
            estimatedTime: 10,
            dependencies: ['setup-students'],
            automatable: true,
            icon: 'Key',
            color: 'purple',
          });
        }
        break;

      case EventPhase.PUBLISHING:
        actions.push({
          id: 'publish-gallery',
          type: 'publish',
          title: 'Publicar Galería',
          description: 'Hacer visible la galería para las familias',
          priority: WorkflowPriority.CRITICAL,
          estimatedTime: 5,
          dependencies: ['bulk-tag-photos', 'generate-tokens'],
          automatable: false,
          icon: 'Globe',
          color: 'blue',
        });
        break;

      case EventPhase.ACTIVE_SALES:
        if (metrics.engagementRate < 0.3) {
          actions.push({
            id: 'boost-engagement',
            type: 'notify',
            title: 'Impulsar Participación',
            description: 'Enviar recordatorios y mejorar comunicación',
            priority: WorkflowPriority.MEDIUM,
            estimatedTime: 20,
            dependencies: [],
            automatable: true,
            icon: 'TrendingUp',
            color: 'green',
          });
        }
        break;

      case EventPhase.FULFILLMENT:
        actions.push({
          id: 'process-orders',
          type: 'export',
          title: 'Procesar Pedidos',
          description: `${metrics.pendingOrders} pedidos pendientes de procesamiento`,
          priority: WorkflowPriority.HIGH,
          estimatedTime: 45,
          dependencies: [],
          automatable: false,
          icon: 'Package',
          color: 'orange',
        });
        break;
    }

    return actions;
  }

  static detectQualityIssues(
    metrics: EventMetrics,
    eventInfo: any
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for untagged photos
    if (metrics.untaggedPhotos > metrics.totalPhotos * 0.3) {
      issues.push({
        id: 'high-untagged-photos',
        type: 'untagged_content',
        severity: 'high',
        title: 'Muchas Fotos Sin Etiquetar',
        description: `${metrics.untaggedPhotos} fotos no tienen etiquetas asignadas`,
        resolution: 'Usa el etiquetado en lotes para acelerar el proceso',
        autoFixable: true,
        affectedComponents: ['photos', 'gallery'],
        category: 'photos',
        timestamp: new Date().toISOString(),
        actionRequired: true,
      });
    }

    // Check for low engagement
    if (metrics.engagementRate < 0.2 && eventInfo.published) {
      issues.push({
        id: 'low-engagement',
        type: 'low_engagement',
        severity: 'medium',
        title: 'Baja Participación de Familias',
        description: `Solo ${Math.round(metrics.engagementRate * 100)}% de las familias han visitado la galería`,
        resolution: 'Considera enviar recordatorios o revisar la comunicación',
        autoFixable: false,
        affectedComponents: ['communication', 'analytics'],
        category: 'user_experience',
        timestamp: new Date().toISOString(),
        actionRequired: false,
      });
    }

    // Check for missing student data
    if (metrics.totalSubjects === 0 && metrics.totalPhotos > 0) {
      issues.push({
        id: 'missing-students',
        type: 'incomplete_setup',
        severity: 'critical',
        title: 'Faltan Datos de Estudiantes',
        description: 'Hay fotos subidas pero no estudiantes registrados',
        resolution: 'Importa la lista de estudiantes antes de continuar',
        autoFixable: false,
        affectedComponents: ['students', 'setup'],
        category: 'data',
        timestamp: new Date().toISOString(),
        actionRequired: true,
      });
    }

    return issues;
  }

  static generateSmartSuggestions(
    phase: EventPhase,
    metrics: EventMetrics
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Suggest bulk operations for efficiency
    if (metrics.untaggedPhotos > 20) {
      suggestions.push({
        id: 'bulk-tagging-suggestion',
        type: 'optimization',
        title: 'Etiquetado Inteligente en Lotes',
        description: 'Usa IA para etiquetar fotos similares automáticamente',
        impact: 'high',
        effort: 'low',
        expectedOutcome: `Podrías etiquetar ~${Math.ceil(metrics.untaggedPhotos * 0.7)} fotos automáticamente`,
        action: () => console.log('Bulk tagging initiated'),
      });
    }

    // Revenue optimization
    if (metrics.conversionRate < 0.4 && metrics.totalOrders > 0) {
      suggestions.push({
        id: 'pricing-optimization',
        type: 'revenue',
        title: 'Optimizar Precios',
        description: 'Analizar patrones de compra para ajustar precios',
        impact: 'medium',
        effort: 'medium',
        expectedOutcome: `Potencial aumento del 15-25% en conversiones`,
        action: () => console.log('Price optimization analysis'),
      });
    }

    // Engagement improvement
    if (metrics.engagementRate < 0.5) {
      suggestions.push({
        id: 'engagement-boost',
        type: 'engagement',
        title: 'Mejorar Comunicación',
        description: 'Enviar recordatorios personalizados a familias inactivas',
        impact: 'high',
        effort: 'low',
        expectedOutcome: 'Incremento esperado del 30% en visitas',
        action: () => console.log('Engagement campaign initiated'),
      });
    }

    return suggestions;
  }
}

// ===========================================
// ZUSTAND STORE WITH REAL-TIME SYNC
// ===========================================

interface EventManagementStore extends EventState {
  // Actions
  initializeEvent: (eventId: string) => Promise<void>;
  updateMetrics: (metrics: Partial<EventMetrics>) => void;
  completeAction: (actionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  setActiveView: (view: EventState['activeView']) => void;
  setContextualPanel: (panel: string | null) => void;
  addNotification: (notification: any) => void;
  clearNotifications: () => void;

  // Computed getters
  getProgressPercentage: () => number;
  getCurrentPriorities: () => WorkflowAction[];
  getHealthScore: () => number;
}

export const useEventManagement = create<EventManagementStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    eventId: '',
    eventInfo: null,
    metrics: {
      totalPhotos: 0,
      taggedPhotos: 0,
      untaggedPhotos: 0,
      totalSubjects: 0,
      activeTokens: 0,
      totalOrders: 0,
      pendingOrders: 0,
      revenue: 0,
      conversionRate: 0,
      engagementRate: 0,
      qualityScore: 0,
      completionPercentage: 0,
    },
    currentPhase: EventPhase.SETUP,
    workflowActions: [],
    completedActions: [],
    nextActions: [],
    blockers: [],
    smartSuggestions: [],
    automationRules: [],
    qualityIssues: [],
    activeView: 'dashboard',
    contextualPanel: null,
    notificationQueue: [],
    lastUpdated: new Date(),
    syncStatus: 'synced',

    // Actions
    initializeEvent: async (eventId: string) => {
      set({ syncStatus: 'syncing' });

      try {
        // Fetch event data
        const response = await fetch(`/api/admin/events/${eventId}`);
        const data = await response.json();

        const eventInfo = data.event;
        const metrics = {
          totalPhotos: eventInfo.stats?.totalPhotos || 0,
          taggedPhotos:
            (eventInfo.stats?.totalPhotos || 0) -
            (eventInfo.stats?.untaggedPhotos || 0),
          untaggedPhotos: eventInfo.stats?.untaggedPhotos || 0,
          totalSubjects: eventInfo.stats?.totalSubjects || 0,
          activeTokens: eventInfo.stats?.totalSubjects || 0, // Assuming all subjects have tokens
          totalOrders: eventInfo.stats?.totalOrders || 0,
          pendingOrders: eventInfo.stats?.pendingOrders || 0,
          revenue: eventInfo.stats?.revenue || 0,
          conversionRate:
            eventInfo.stats?.totalSubjects > 0
              ? (eventInfo.stats?.totalOrders || 0) /
                eventInfo.stats.totalSubjects
              : 0,
          engagementRate: 0.5, // TODO: Calculate from actual data
          qualityScore: 0.8, // TODO: Calculate from quality metrics
          completionPercentage: 0, // Will be calculated
        };

        const currentPhase = WorkflowDetector.detectEventPhase(
          metrics,
          eventInfo
        );
        const nextActions = WorkflowDetector.generateNextActions(
          currentPhase,
          metrics,
          eventInfo
        );
        const qualityIssues = WorkflowDetector.detectQualityIssues(
          metrics,
          eventInfo
        );
        const smartSuggestions = WorkflowDetector.generateSmartSuggestions(
          currentPhase,
          metrics
        );

        set({
          eventId,
          eventInfo,
          metrics,
          currentPhase,
          nextActions,
          qualityIssues,
          smartSuggestions,
          lastUpdated: new Date(),
          syncStatus: 'synced',
        });
      } catch (error) {
        console.error('Failed to initialize event:', error);
        set({ syncStatus: 'error' });
      }
    },

    updateMetrics: (newMetrics: Partial<EventMetrics>) => {
      const state = get();
      const updatedMetrics = { ...state.metrics, ...newMetrics };
      const currentPhase = WorkflowDetector.detectEventPhase(
        updatedMetrics,
        state.eventInfo
      );
      const nextActions = WorkflowDetector.generateNextActions(
        currentPhase,
        updatedMetrics,
        state.eventInfo
      );
      const qualityIssues = WorkflowDetector.detectQualityIssues(
        updatedMetrics,
        state.eventInfo
      );
      const smartSuggestions = WorkflowDetector.generateSmartSuggestions(
        currentPhase,
        updatedMetrics
      );

      set({
        metrics: updatedMetrics,
        currentPhase,
        nextActions,
        qualityIssues,
        smartSuggestions,
        lastUpdated: new Date(),
      });
    },

    completeAction: (actionId: string) => {
      const state = get();
      set({
        completedActions: [...state.completedActions, actionId],
        nextActions: state.nextActions.filter(
          (action) => action.id !== actionId
        ),
      });
    },

    dismissSuggestion: (suggestionId: string) => {
      const state = get();
      set({
        smartSuggestions: state.smartSuggestions.filter(
          (suggestion) => suggestion.id !== suggestionId
        ),
      });
    },

    setActiveView: (view: EventState['activeView']) => {
      set({ activeView: view });
    },

    setContextualPanel: (panel: string | null) => {
      set({ contextualPanel: panel });
    },

    addNotification: (notification: any) => {
      const state = get();
      set({
        notificationQueue: [notification, ...state.notificationQueue],
      });
    },

    clearNotifications: () => {
      set({ notificationQueue: [] });
    },

    // Computed getters
    getProgressPercentage: () => {
      const state = get();
      const totalActions = state.workflowActions.length;
      const completed = state.completedActions.length;
      return totalActions > 0 ? (completed / totalActions) * 100 : 0;
    },

    getCurrentPriorities: () => {
      const state = get();
      return state.nextActions
        .filter(
          (action) =>
            action.priority === WorkflowPriority.CRITICAL ||
            action.priority === WorkflowPriority.HIGH
        )
        .sort((a, b) => {
          const priorityOrder = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
            optional: 4,
          };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    },

    getHealthScore: () => {
      const state = get();
      const metrics = state.metrics;

      // Calculate health score based on multiple factors
      let score = 100;

      // Penalty for untagged photos
      if (metrics.totalPhotos > 0) {
        const untaggedRatio = metrics.untaggedPhotos / metrics.totalPhotos;
        score -= untaggedRatio * 30;
      }

      // Penalty for low engagement
      score -= (1 - metrics.engagementRate) * 20;

      // Penalty for quality issues
      score -= state.qualityIssues.length * 10;

      // Bonus for high conversion
      score += metrics.conversionRate * 10;

      return Math.max(0, Math.min(100, score));
    },
  }))
);

// Auto-sync subscription
useEventManagement.subscribe(
  (state) => state.eventId,
  (eventId) => {
    if (eventId) {
      // Set up real-time sync interval
      const interval = setInterval(() => {
        useEventManagement.getState().initializeEvent(eventId);
      }, 30000); // Sync every 30 seconds

      return () => clearInterval(interval);
    }
  }
);
