'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  PlayCircle,
  MessageCircle,
  Search,
  ChevronRight,
  ExternalLink,
  Users,
  Tag,
  Camera,
  ShoppingCart,
  QrCode,
  Settings,
  Zap,
  ArrowRight,
  CheckCircle,
  Info,
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  articles: Article[];
}

interface Article {
  id: string;
  title: string;
  description: string;
  readTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Primeros Pasos',
    description: 'Guía completa para configurar y usar LookEscolar',
    icon: BookOpen,
    articles: [
      {
        id: 'quick-start',
        title: 'Guía de Inicio Rápido',
        description: 'Configura tu primera sesión fotográfica en 5 minutos',
        readTime: '5 min',
        difficulty: 'beginner',
        tags: ['setup', 'basics'],
      },
      {
        id: 'first-event',
        title: 'Crear tu Primer Evento',
        description: 'Paso a paso para crear un evento escolar desde cero',
        readTime: '8 min',
        difficulty: 'beginner',
        tags: ['events', 'setup'],
      },
    ],
  },
  {
    id: 'subjects-flow',
    title: 'Gestión de Alumnos',
    description: 'Todo sobre el sistema de estudiantes y tokens',
    icon: Users,
    articles: [
      {
        id: 'subjects-overview',
        title: 'Flujo Completo de Estudiantes',
        description: 'Desde la creación hasta el acceso familiar',
        readTime: '12 min',
        difficulty: 'intermediate',
        tags: ['subjects', 'workflow', 'tokens'],
      },
      {
        id: 'qr-management',
        title: 'Códigos QR y Tokens',
        description: 'Generación, impresión y gestión de códigos QR',
        readTime: '10 min',
        difficulty: 'intermediate',
        tags: ['qr', 'tokens', 'printing'],
      },
    ],
  },
  {
    id: 'tagging-flow',
    title: 'Etiquetado de Fotos',
    description: 'Sistema de asignación de fotos a estudiantes',
    icon: Tag,
    articles: [
      {
        id: 'tagging-overview',
        title: 'Para qué sirve el Tagging',
        description: 'Concepto y beneficios del sistema de etiquetado',
        readTime: '6 min',
        difficulty: 'beginner',
        tags: ['tagging', 'concept'],
      },
      {
        id: 'tagging-methods',
        title: 'Métodos de Etiquetado',
        description: 'Etiquetado manual vs automático con QR',
        readTime: '15 min',
        difficulty: 'advanced',
        tags: ['tagging', 'qr-scanning', 'workflow'],
      },
    ],
  },
  {
    id: 'photo-management',
    title: 'Gestión de Fotos',
    description: 'Upload, procesamiento y organización',
    icon: Camera,
    articles: [
      {
        id: 'photo-upload',
        title: 'Subir Fotos al Sistema',
        description: 'Proceso de upload y watermark automático',
        readTime: '10 min',
        difficulty: 'intermediate',
        tags: ['upload', 'watermark', 'processing'],
      },
    ],
  },
  {
    id: 'orders-sync',
    title: 'Pedidos y Pagos',
    description: 'Sincronización con Mercado Pago',
    icon: ShoppingCart,
    articles: [
      {
        id: 'orders-overview',
        title: 'Sistema de Pedidos',
        description: 'Cómo funcionan los pedidos y su sincronización',
        readTime: '8 min',
        difficulty: 'intermediate',
        tags: ['orders', 'payments', 'mercadopago'],
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Atajos de Teclado',
    description: 'Shortcuts para trabajar más rápido',
    icon: Zap,
    articles: [
      {
        id: 'keyboard-shortcuts',
        title: 'Reference de Atajos',
        description: 'Todos los shortcuts disponibles en el sistema',
        readTime: '3 min',
        difficulty: 'beginner',
        tags: ['shortcuts', 'productivity'],
      },
    ],
  },
];

const faqs = [
  {
    question: '¿Para qué sirve el sistema de tagging?',
    answer:
      'El tagging permite asignar fotos específicas a cada alumno. Así las familias solo ven las fotos de su hijo/a, no todas las fotos del evento. Es como crear una galería personalizada para cada familia.',
  },
  {
    question: '¿Cómo funciona la sincronización de pedidos?',
    answer:
      'Los pedidos se sincronizan automáticamente con Mercado Pago mediante webhooks. Los estados son: pending (creado) → processing (en revisión) → approved (pagado) → delivered (entregado por admin).',
  },
  {
    question: '¿Qué es el flujo de subjects/estudiantes?',
    answer:
      'Es el proceso completo: 1) Admin crea lista de alumnos 2) Sistema genera tokens únicos y QRs 3) Se imprimen QRs y entregan 4) En el evento, cada alumno tiene su QR 5) Familias acceden con su token a ver solo sus fotos.',
  },
  {
    question: '¿Cómo funciona el QR en la vida real?',
    answer:
      'El admin imprime los QRs y los entrega antes del evento. El día de las fotos, cada alumno lleva su QR. Después de sacar fotos, el admin escanea el QR del alumno y le asigna las fotos correspondientes.',
  },
];

export default function AdminHelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const filteredSections = helpSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.articles.some(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getDifficultyColor = (difficulty: Article['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'advanced':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    }
  };

  const getDifficultyLabel = (difficulty: Article['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'Básico';
      case 'intermediate':
        return 'Intermedio';
      case 'advanced':
        return 'Avanzado';
    }
  };

  return (
    <div className="bg-background/50 min-h-screen">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-2">
              <HelpCircle className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-foreground text-3xl font-bold">
              Centro de Ayuda
            </h1>
          </div>
          <p className="text-text-secondary">
            Documentación completa, tutoriales y guías para sacar el máximo
            provecho de LookEscolar
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="text-foreground/40 absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform" />
            <input
              type="text"
              placeholder="Buscar en la documentación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 border-border sticky top-6 rounded-lg border p-4">
              <h3 className="text-gray-900 dark:text-gray-100 mb-4 font-semibold">
                Secciones
              </h3>
              <div className="space-y-1">
                {filteredSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`touch-target flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/10 text-primary border-primary/20 border'
                          : 'text-card-foreground hover:text-foreground hover:bg-surface'
                      } `}
                    >
                      <Icon
                        className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-card-foreground/60'}`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {section.title}
                        </div>
                        <div className="text-foreground/60 mt-0.5 text-xs">
                          {section.articles.length} artículos
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Links */}
              <div className="border-border mt-6 border-t pt-6">
                <h4 className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                  Enlaces Rápidos
                </h4>
                <div className="space-y-2">
                  <a
                    href="#"
                    className="text-card-foreground/70 hover:text-primary flex items-center gap-2 text-sm transition-colors"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Videos Tutoriales
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="#"
                    className="text-card-foreground/70 hover:text-primary flex items-center gap-2 text-sm transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Soporte Técnico
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Current Section */}
            {filteredSections.map((section) => {
              if (section.id !== activeSection) return null;

              return (
                <div key={section.id} className="space-y-6">
                  {/* Section Header */}
                  <div className="bg-white dark:bg-gray-900 border-border rounded-lg border p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-3">
                        <section.icon className="text-primary h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-gray-900 dark:text-gray-100 mb-2 text-2xl font-bold">
                          {section.title}
                        </h2>
                        <p className="text-card-foreground/70">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Articles */}
                  <div className="space-y-4">
                    {section.articles.map((article) => (
                      <div
                        key={article.id}
                        className="bg-white dark:bg-gray-900 border-border hover:border-primary/20 cursor-pointer rounded-lg border p-6 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="text-gray-900 dark:text-gray-100 font-semibold">
                                {article.title}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${getDifficultyColor(article.difficulty)}`}
                              >
                                {getDifficultyLabel(article.difficulty)}
                              </span>
                            </div>

                            <p className="text-card-foreground/70 mb-3 text-sm">
                              {article.description}
                            </p>

                            <div className="text-card-foreground/50 flex items-center gap-4 text-xs">
                              <span>📖 {article.readTime}</span>
                              <div className="flex gap-1">
                                {article.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded bg-surface px-2 py-1"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="text-card-foreground/40 h-5 w-5" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Special content for key sections */}
                  {section.id === 'subjects-flow' && (
                    <div className="bg-white dark:bg-gray-900 border-border rounded-lg border p-6">
                      <h3 className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Users className="h-5 w-5" />
                        Flujo Completo de Estudiantes
                      </h3>

                      <div className="space-y-6">
                        {/* Digital Flow */}
                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 font-medium">
                            <Settings className="h-4 w-4" />
                            Flujo Digital (En la App)
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                1
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Admin crea evento
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Nuevo evento escolar con fecha y colegio
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                2
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Genera lista de alumnos
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Agregar alumnos uno por uno o importar CSV
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                3
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Sistema genera tokens
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Token único de 20+ caracteres para cada alumno
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                4
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Genera QRs
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  PDF con QRs listos para imprimir y entregar
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Real Life Flow */}
                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 font-medium">
                            <Camera className="h-4 w-4" />
                            Flujo en la Vida Real
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-secondary/20 text-secondary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                1
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Imprimir QRs
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Descargar PDF y imprimir códigos QR
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-secondary/20 text-secondary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                2
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Entregar QRs
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Dar QR a cada alumno/familia antes del evento
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-secondary/20 text-secondary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                3
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Día de fotos
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Cada alumno lleva su QR al evento
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-secondary/20 text-secondary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                4
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Acceso familiar
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Familia escanea QR → accede a /f/[token] → ve
                                  solo sus fotos
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Benefits */}
                        <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
                          <h4 className="text-primary mb-2 flex items-center gap-2 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Beneficios del Sistema
                          </h4>
                          <ul className="text-card-foreground/70 space-y-1 text-sm">
                            <li>
                              • Cada familia ve solo sus fotos (privacidad)
                            </li>
                            <li>
                              • No hay confusion con fotos de otros alumnos
                            </li>
                            <li>
                              • Acceso directo sin registrarse ni hacer login
                            </li>
                            <li>
                              • Token único imposible de adivinar (seguridad)
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'tagging-flow' && (
                    <div className="bg-white dark:bg-gray-900 border-border rounded-lg border p-6">
                      <h3 className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Tag className="h-5 w-5" />
                        Para Qué Sirve el Tagging
                      </h3>

                      <div className="space-y-6">
                        {/* Concept */}
                        <div className="bg-info/5 border-info/20 rounded-lg border p-4">
                          <div className="flex items-start gap-3">
                            <Info className="text-info mt-0.5 h-5 w-5 flex-shrink-0" />
                            <div>
                              <h4 className="text-info mb-1 font-medium">
                                Concepto Principal
                              </h4>
                              <p className="text-card-foreground/70 text-sm">
                                El tagging es el proceso de{' '}
                                <strong>
                                  asignar fotos específicas a cada alumno
                                </strong>
                                . Es como crear una galería personalizada donde
                                cada familia solo ve las fotos de su hijo/a.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Methods */}
                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                            Métodos de Etiquetado
                          </h4>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Manual */}
                            <div className="border-border rounded-lg border p-4">
                              <h5 className="text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2 font-medium">
                                <Settings className="h-4 w-4" />
                                Método Manual (Digital)
                              </h5>
                              <div className="text-card-foreground/70 space-y-2 text-sm">
                                <p>1. Ir a página de Tagging</p>
                                <p>2. Seleccionar fotos</p>
                                <p>3. Elegir alumno de la lista</p>
                                <p>4. Asignar fotos seleccionadas</p>
                              </div>
                            </div>

                            {/* QR */}
                            <div className="border-border rounded-lg border p-4">
                              <h5 className="text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2 font-medium">
                                <QrCode className="h-4 w-4" />
                                Método QR (En el Evento)
                              </h5>
                              <div className="text-card-foreground/70 space-y-2 text-sm">
                                <p>1. Sacar fotos del alumno</p>
                                <p>2. Escanear su QR</p>
                                <p>3. Sistema asigna automáticamente</p>
                                <p>4. Repetir con siguiente alumno</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Workflow */}
                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                            Flujo Completo en el Evento
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="bg-accent/20 text-accent flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                1
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Subir fotos al sistema
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Upload masivo con watermark automático
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-accent/20 text-accent flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                2
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Asignar fotos (tagging)
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Manual en la app o QR durante el evento
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="text-card-foreground/40 ml-3 h-4 w-4" />

                            <div className="flex items-start gap-3">
                              <div className="bg-accent/20 text-accent flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                                3
                              </div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Acceso familiar
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Familia accede y ve solo fotos asignadas
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'orders-sync' && (
                    <div className="bg-white dark:bg-gray-900 border-border rounded-lg border p-6">
                      <h3 className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 text-lg font-semibold">
                        <ShoppingCart className="h-5 w-5" />
                        Sincronización de Pedidos
                      </h3>

                      <div className="space-y-4">
                        <div className="bg-success/5 border-success/20 rounded-lg border p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
                            <div>
                              <h4 className="text-success mb-1 font-medium">
                                Estado Actual
                              </h4>
                              <p className="text-card-foreground/70 text-sm">
                                Los pedidos están{' '}
                                <strong>completamente sincronizados</strong> con
                                Mercado Pago mediante webhooks automáticos.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                            Estados de Pedidos
                          </h4>
                          <div className="space-y-3">
                            <div className="border-border flex items-center gap-3 rounded-lg border p-3">
                              <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Pending
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Pedido creado, esperando pago
                                </p>
                              </div>
                            </div>

                            <div className="border-border flex items-center gap-3 rounded-lg border p-3">
                              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Processing
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Mercado Pago procesando el pago
                                </p>
                              </div>
                            </div>

                            <div className="border-border flex items-center gap-3 rounded-lg border p-3">
                              <div className="h-3 w-3 rounded-full bg-green-400"></div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Approved
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Pago confirmado por Mercado Pago
                                </p>
                              </div>
                            </div>

                            <div className="border-border flex items-center gap-3 rounded-lg border p-3">
                              <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                              <div>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                  Delivered
                                </p>
                                <p className="text-card-foreground/70 text-sm">
                                  Marcado como entregado por el admin
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-2 font-medium">
                            Proceso de Sincronización
                          </h4>
                          <ul className="text-card-foreground/70 space-y-1 text-sm">
                            <li>
                              • Webhook automático de Mercado Pago actualiza
                              estados
                            </li>
                            <li>• Verificación de firma HMAC para seguridad</li>
                            <li>
                              • Admin puede marcar como entregado manualmente
                            </li>
                            <li>• Estado se actualiza en tiempo real</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {section.id === 'shortcuts' && (
                    <div className="bg-white dark:bg-gray-900 border-border rounded-lg border p-6">
                      <h3 className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Zap className="h-5 w-5" />
                        Atajos de Teclado
                      </h3>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                            Navegación General
                          </h4>
                          <div className="space-y-2">
                            {[
                              {
                                keys: ['Ctrl', 'K'],
                                desc: 'Abrir paleta de comandos',
                              },
                              {
                                keys: ['Ctrl', '/'],
                                desc: 'Buscar en el sistema',
                              },
                              { keys: ['Esc'], desc: 'Cerrar modal/dialog' },
                            ].map((shortcut, idx) => (
                              <div
                                key={idx}
                                className="border-border/50 flex items-center justify-between rounded border p-2"
                              >
                                <span className="text-card-foreground/70 text-sm">
                                  {shortcut.desc}
                                </span>
                                <div className="flex gap-1">
                                  {shortcut.keys.map((key) => (
                                    <kbd
                                      key={key}
                                      className="border-border rounded border bg-surface px-2 py-1 text-xs"
                                    >
                                      {key}
                                    </kbd>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-gray-900 dark:text-gray-100 mb-3 font-medium">
                            Tagging
                          </h4>
                          <div className="space-y-2">
                            {[
                              { keys: ['Space'], desc: 'Seleccionar foto' },
                              {
                                keys: ['Ctrl', 'A'],
                                desc: 'Seleccionar todas',
                              },
                              {
                                keys: ['Enter'],
                                desc: 'Asignar seleccionadas',
                              },
                            ].map((shortcut, idx) => (
                              <div
                                key={idx}
                                className="border-border/50 flex items-center justify-between rounded border p-2"
                              >
                                <span className="text-card-foreground/70 text-sm">
                                  {shortcut.desc}
                                </span>
                                <div className="flex gap-1">
                                  {shortcut.keys.map((key) => (
                                    <kbd
                                      key={key}
                                      className="border-border rounded border bg-surface px-2 py-1 text-xs"
                                    >
                                      {key}
                                    </kbd>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* FAQ Section */}
            <div className="bg-white dark:bg-gray-900 border-border mt-8 rounded-lg border p-6">
              <h3 className="text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 text-lg font-semibold">
                <MessageCircle className="h-5 w-5" />
                Preguntas Frecuentes
              </h3>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-border rounded-lg border">
                    <button
                      onClick={() =>
                        setExpandedFAQ(expandedFAQ === index ? null : index)
                      }
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface"
                    >
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {faq.question}
                      </span>
                      <ChevronRight
                        className={`text-card-foreground/40 h-5 w-5 transition-transform ${
                          expandedFAQ === index ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {expandedFAQ === index && (
                      <div className="px-4 pb-4">
                        <p className="text-card-foreground/70 text-sm leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
