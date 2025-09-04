/**
 * 🎯 EventContextBanner - Banner de contexto de evento
 * 
 * Muestra información del evento actual cuando PhotoAdmin se accede con event_id
 * Permite navegar al gestor específico del evento y limpiar contexto
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Camera,
  ArrowRight,
  X,
  Info,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EventInfo {
  id: string;
  name: string;
  school?: string;
  date?: string;
  location?: string;
  status?: string;
  stats?: {
    totalPhotos?: number;
    totalSubjects?: number;
    totalOrders?: number;
  };
}

interface EventContextBannerProps {
  eventId: string;
  onRemoveContext?: () => void;
  className?: string;
  compact?: boolean;
}

export function EventContextBanner({
  eventId,
  onRemoveContext,
  className,
  compact = false
}: EventContextBannerProps) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/events/${eventId}`);
        if (!response.ok) {
          throw new Error('Event not found');
        }
        
        const data = await response.json();
        if (!data.success || !data.event) {
          throw new Error('Invalid event data');
        }
        
        setEvent(data.event);
      } catch (err) {
        console.error('Error fetching event info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventInfo();
    }
  }, [eventId]);

  if (loading) {
    return (
      <Card className={cn("border-blue-200 bg-blue-50/50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <div className="text-sm text-blue-700">Cargando información del evento...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !event) {
    return (
      <Card className={cn("border-amber-200 bg-amber-50/50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                {error || 'Evento no encontrado'} (ID: {eventId})
              </span>
            </div>
            {onRemoveContext && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemoveContext}
                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={cn("border-blue-200 bg-blue-50/50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Camera className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-blue-900 text-sm">
                  {event.school || event.name}
                </div>
                <div className="text-xs text-blue-600">
                  Contexto de evento activo
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/events/${eventId}/library`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Gestor
                </Button>
              </Link>
              {onRemoveContext && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveContext}
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="h-5 w-5 text-blue-600" />
            </div>
            
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold text-blue-900">
                  {event.school || event.name}
                </h3>
                <p className="text-sm text-blue-600">
                  Navegando en contexto de evento específico
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-blue-700">
                {event.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.date).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                )}
                {event.stats?.totalPhotos && (
                  <div className="flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {event.stats.totalPhotos} fotos
                  </div>
                )}
                {event.stats?.totalSubjects && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.stats.totalSubjects} estudiantes
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {event.status && (
              <Badge 
                variant={event.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {event.status === 'active' ? 'Activo' : event.status}
              </Badge>
            )}
            
            <Link href={`/admin/events/${eventId}/library`}>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Ir al Gestor del Evento
              </Button>
            </Link>
            
            {onRemoveContext && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemoveContext}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EventContextBanner;
