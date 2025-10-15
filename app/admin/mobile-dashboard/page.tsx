'use client';

import { useState } from 'react';
import { MobileDashboardLayout } from './components/MobileDashboardLayout';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { PhotoUploadQueue } from './components/PhotoUploadQueue';
import { EventStatusCards } from './components/EventStatusCards';
import { OrderStatusMonitor } from './components/OrderStatusMonitor';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useServiceWorker } from './hooks/useServiceWorker';
import { motion } from 'framer-motion';

export default function MobileDashboardPage() {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'upload' | 'events' | 'orders'>('dashboard');
  const [user] = useState({
    name: 'María González',
    email: 'maria@lookescolar.com',
    avatar: undefined,
  });

  // Service Worker integration
  const {
    isRegistered,
    updateAvailable,
    update,
    error: swError,
  } = useServiceWorker({
    onUpdate: (registration) => {
      console.log('[SW] Update available:', registration);
    },
    onError: (error) => {
      console.error('[SW] Service Worker error:', error);
    },
  });

  // Datos de ejemplo para eventos
  const [events] = useState([
    {
      id: '1',
      name: 'Graduación 2024',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 días en el futuro
      location: 'Auditorio Principal',
      status: 'active' as const,
      photoCount: 127,
      expectedPhotos: 150,
      attendees: 85,
      description: 'Ceremonia de graduación de secundaria con entrega de diplomas',
      priority: 'high' as const,
    },
    {
      id: '2',
      name: 'Fiesta de Fin de Curso',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Mañana
      location: 'Gimnasio',
      status: 'upcoming' as const,
      photoCount: 0,
      expectedPhotos: 200,
      attendees: 120,
      description: 'Celebración del fin del curso académico',
      priority: 'normal' as const,
    },
    {
      id: '3',
      name: 'Evento Deportivo',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días atrás
      location: 'Campo de Fútbol',
      status: 'completed' as const,
      photoCount: 89,
      expectedPhotos: 100,
      attendees: 200,
      description: 'Torneo inter-escolar de fútbol',
      priority: 'normal' as const,
    },
  ]);

  // Datos de ejemplo para pedidos
  const [orders] = useState([
    {
      id: '1',
      orderNumber: 'ORD-001',
      customerName: 'Ana López',
      customerEmail: 'ana.lopez@email.com',
      customerPhone: '+34 612 345 678',
      eventName: 'Graduación 2024',
      eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'processing' as const,
      items: [
        {
          id: '1',
          type: 'photo' as const,
          quantity: 12,
          price: 15.50,
          description: 'Fotos individuales graduación',
        },
        {
          id: '2',
          type: 'album' as const,
          quantity: 1,
          price: 45.00,
          description: 'Álbum de fotos personalizado',
        },
      ],
      total: 231.00,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      priority: 'normal' as const,
      notes: 'Cliente solicita entrega urgente',
    },
    {
      id: '2',
      orderNumber: 'ORD-002',
      customerName: 'Carlos Martínez',
      customerEmail: 'carlos.martinez@email.com',
      customerPhone: '+34 623 456 789',
      eventName: 'Fiesta de Fin de Curso',
      eventDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'pending' as const,
      items: [
        {
          id: '3',
          type: 'digital' as const,
          quantity: 25,
          price: 8.00,
          description: 'Paquete digital completo',
        },
      ],
      total: 200.00,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      priority: 'high' as const,
    },
  ]);

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logout');
  };

  const handleUpload = () => {
    setActiveSection('upload');
  };

  const handleViewEvents = () => {
    setActiveSection('events');
  };

  const handleViewOrders = () => {
    setActiveSection('orders');
  };

  const handleViewStats = () => {
    // TODO: Navigate to stats page
    console.log('View stats');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings
    console.log('Settings');
  };

  return (
    <MobileDashboardLayout
      title="LookEscolar"
      subtitle="Dashboard Móvil"
      user={user}
      onLogout={handleLogout}
    >
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {activeSection === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                ¡Hola, {user.name.split(' ')[0]}!
              </h1>
              <p className="text-muted-foreground">
                Gestiona tus eventos y fotos desde cualquier lugar
              </p>
            </div>

            {/* Quick Actions */}
            <QuickActionsGrid
              onUpload={handleUpload}
              onViewEvents={handleViewEvents}
              onViewOrders={handleViewOrders}
              onViewStats={handleViewStats}
              onSettings={handleSettings}
            />

            {/* Recent Activity Summary */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Actividad Reciente
              </h2>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 shadow-sm ring-1 ring-green-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Evento "Graduación 2024"
                      </p>
                      <p className="text-xs text-green-600">
                        45 fotos subidas exitosamente
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm ring-1 ring-blue-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Pedidos procesados
                      </p>
                      <p className="text-xs text-blue-600">
                        12 pedidos completados hoy
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 shadow-sm ring-1 ring-orange-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Próximo evento
                      </p>
                      <p className="text-xs text-orange-600">
                        "Fiesta de Fin de Curso" - Mañana 10:00
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Rendimiento del Día
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-xl p-4 shadow-sm ring-1 ring-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-600">127</p>
                    <p className="text-sm text-muted-foreground">Fotos Subidas</p>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-4 shadow-sm ring-1 ring-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">98%</p>
                    <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <OfflineIndicator
              variant="full"
              showDetails={true}
              onRetry={() => {
                console.log('Retry connection');
              }}
            />

            {/* Service Worker Status */}
            {isRegistered && (
              <div className="bg-background rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Funcionalidad Offline</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">Activo</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  El modo offline está habilitado. Puedes continuar trabajando sin conexión a internet.
                </p>
                {updateAvailable && (
                  <button
                    onClick={update}
                    className="w-full bg-primary-600 text-foreground py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    Actualizar Aplicación
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeSection === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveSection('dashboard')}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                ← Volver al Dashboard
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Subir Fotos
              </h2>
              <p className="text-muted-foreground">
                Arrastra fotos aquí o selecciona archivos para subirlos a tus eventos
              </p>
            </div>

            <PhotoUploadQueue
              onUploadComplete={(item) => {
                console.log('Upload completed:', item);
                // TODO: Show success message
              }}
              onUploadError={(item, error) => {
                console.error('Upload failed:', item, error);
                // TODO: Show error message
              }}
            />
          </div>
        )}

        {activeSection === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveSection('dashboard')}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                ← Volver al Dashboard
              </button>
            </div>

            <EventStatusCards
              events={events}
              onEventSelect={(event) => {
                console.log('Event selected:', event);
              }}
              onEventEdit={(event) => {
                console.log('Edit event:', event);
              }}
              onEventDelete={(event) => {
                console.log('Delete event:', event);
              }}
              onCreateEvent={() => {
                console.log('Create new event');
              }}
            />
          </div>
        )}

        {activeSection === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveSection('dashboard')}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                ← Volver al Dashboard
              </button>
            </div>

            <OrderStatusMonitor
              orders={orders}
              onOrderSelect={(order) => {
                console.log('Order selected:', order);
              }}
              onOrderUpdate={(order) => {
                console.log('Update order:', order);
              }}
              onRefresh={() => {
                console.log('Refresh orders');
              }}
            />
          </div>
        )}
      </motion.div>
    </MobileDashboardLayout>
  );
}
