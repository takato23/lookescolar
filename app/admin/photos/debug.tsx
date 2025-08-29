'use client';

import { useEffect, useState } from 'react';

export default function PhotosDebugPage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear localStorage immediately on mount
  useEffect(() => {
    console.log('🧹 Clearing localStorage on debug page mount');
    localStorage.removeItem('le:lastEventId');
    localStorage.removeItem('photoAdminSettings');

    // Clear all localStorage items containing the bad event ID
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value?.includes('83070ba2-738e-4038-ab5e-0c42fe4a2880')) {
        localStorage.removeItem(key);
        console.log('🗑️ Removed localStorage item:', key);
      }
    });
  }, []);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/events');
        const data = await response.json();

        console.log('✅ Events loaded:', data);
        setEvents(data);

        if (data.length > 0) {
          setSelectedEvent(data[0].id);
          localStorage.setItem('le:lastEventId', data[0].id);
        }
      } catch (err) {
        console.error('❌ Failed to load events:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>🔍 Debug: Cargando eventos...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>❌ Error Debug</h1>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1>🐛 Debug: Admin Photos</h1>

      <div style={{ marginBottom: '20px' }}>
        <h3>📅 Eventos disponibles:</h3>
        {events.map((event: any) => (
          <div
            key={event.id}
            style={{
              padding: '10px',
              border:
                selectedEvent === event.id
                  ? '2px solid blue'
                  : '1px solid #ccc',
              margin: '5px 0',
              backgroundColor: selectedEvent === event.id ? '#f0f8ff' : 'white',
            }}
          >
            <strong>{event.name}</strong>
            <br />
            <small>ID: {event.id}</small>
            <br />
            <small>Fecha: {event.date}</small>
            <button
              onClick={() => setSelectedEvent(event.id)}
              style={{ marginTop: '5px', padding: '5px 10px' }}
            >
              Seleccionar
            </button>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div style={{ marginTop: '20px' }}>
          <h3>🎯 Evento seleccionado: {selectedEvent}</h3>
          <a
            href={`/admin/photos?event_id=${selectedEvent}`}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            ➡️ Ir a Admin Photos Normal
          </a>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <h4>🔧 Debug Info:</h4>
        <p>
          localStorage 'le:lastEventId':{' '}
          {localStorage.getItem('le:lastEventId') || 'null'}
        </p>
        <p>Eventos cargados: {events.length}</p>
        <p>Evento seleccionado: {selectedEvent || 'ninguno'}</p>
      </div>
    </div>
  );
}
