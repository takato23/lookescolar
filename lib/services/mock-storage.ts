// Mock storage service para desarrollo
// Simula el almacenamiento de fotos en memoria mientras no tengamos Supabase

interface MockPhoto {
  id: string;
  event_id: string;
  filename: string;
  path: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
  approved: boolean;
  tagged: boolean;
  created_at: string;
  updated_at: string;
  file_size: number;
  tagged_subjects?: Array<{
    id: string;
    name: string;
    grade: string;
  }>;
}

class MockStorageService {
  private photos: Map<string, MockPhoto> = new Map();
  private photosByEvent: Map<string, Set<string>> = new Map();

  constructor() {
    // Inicializar con algunas fotos mock
    this.initializeMockData();
  }

  private initializeMockData() {
    // Agregar fotos mock iniciales para el evento 1
    for (let i = 1; i <= 5; i++) {
      const photo: MockPhoto = {
        id: `initial_photo_${i}`,
        event_id: '1',
        filename: `foto_inicial_${i}.jpg`,
        path: `/mock/photos/foto_${i}.jpg`,
        preview_url: `https://picsum.photos/400/300?random=${i}`,
        size: Math.floor(Math.random() * 2000000) + 500000,
        width: 800,
        height: 600,
        approved: Math.random() > 0.3,
        tagged: Math.random() > 0.4,
        created_at: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
        file_size: Math.floor(Math.random() * 2000000) + 500000,
        tagged_subjects:
          Math.random() > 0.6
            ? [
                {
                  id: `subject_${Math.floor(Math.random() * 50)}`,
                  name: `Alumno ${Math.floor(Math.random() * 100)}`,
                  grade: `${Math.floor(Math.random() * 6) + 1}° Grado`,
                },
              ]
            : [],
      };

      this.addPhoto(photo);
    }
  }

  addPhoto(photo: MockPhoto): void {
    this.photos.set(photo.id, photo);

    // Agregar a índice por evento
    if (!this.photosByEvent.has(photo.event_id)) {
      this.photosByEvent.set(photo.event_id, new Set());
    }
    this.photosByEvent.get(photo.event_id)!.add(photo.id);

    console.log(
      `📸 [MockStorage] Photo added: ${photo.filename} (Event: ${photo.event_id})`
    );
  }

  getPhotosByEvent(eventId: string): MockPhoto[] {
    const photoIds = this.photosByEvent.get(eventId) || new Set();
    const photos = Array.from(photoIds)
      .map((id) => this.photos.get(id))
      .filter(Boolean) as MockPhoto[];

    // Ordenar por fecha de creación descendente
    return photos.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getPhoto(photoId: string): MockPhoto | undefined {
    return this.photos.get(photoId);
  }

  updatePhoto(photoId: string, updates: Partial<MockPhoto>): boolean {
    const photo = this.photos.get(photoId);
    if (!photo) return false;

    const updatedPhoto = {
      ...photo,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.photos.set(photoId, updatedPhoto);
    return true;
  }

  deletePhoto(photoId: string): boolean {
    const photo = this.photos.get(photoId);
    if (!photo) return false;

    // Eliminar del índice por evento
    const eventPhotos = this.photosByEvent.get(photo.event_id);
    if (eventPhotos) {
      eventPhotos.delete(photoId);
    }

    // Eliminar la foto
    return this.photos.delete(photoId);
  }

  getAllPhotos(): MockPhoto[] {
    return Array.from(this.photos.values());
  }

  getStats(eventId?: string) {
    const photos = eventId
      ? this.getPhotosByEvent(eventId)
      : this.getAllPhotos();

    return {
      total: photos.length,
      approved: photos.filter((p) => p.approved).length,
      pending: photos.filter((p) => !p.approved).length,
      tagged: photos.filter((p) => p.tagged).length,
      untagged: photos.filter((p) => !p.tagged).length,
    };
  }

  // Método para asignar fotos a un sujeto (para etiquetado)
  tagPhotoToSubject(
    photoId: string,
    subject: { id: string; name: string; grade: string }
  ) {
    const photo = this.photos.get(photoId);
    if (!photo) return false;

    if (!photo.tagged_subjects) {
      photo.tagged_subjects = [];
    }

    // Evitar duplicados
    if (!photo.tagged_subjects.find((s) => s.id === subject.id)) {
      photo.tagged_subjects.push(subject);
      photo.tagged = true;
      photo.updated_at = new Date().toISOString();
      console.log(
        `🏷️ [MockStorage] Photo ${photoId} tagged to ${subject.name}`
      );
    }

    return true;
  }

  // Limpiar storage (útil para tests)
  clear() {
    this.photos.clear();
    this.photosByEvent.clear();
    console.log('🗑️ [MockStorage] Storage cleared');
  }

  // Reinicializar con datos mock
  reset() {
    this.clear();
    this.initializeMockData();
    console.log('🔄 [MockStorage] Storage reset with mock data');
  }
}

// Singleton instance - IMPORTANTE: usar global para evitar recreación en hot reload
const globalForMockStorage = global as unknown as {
  mockStorageInstance: MockStorageService | undefined;
};

export function getMockStorage(): MockStorageService {
  if (!globalForMockStorage.mockStorageInstance) {
    globalForMockStorage.mockStorageInstance = new MockStorageService();
    console.log('📦 [MockStorage] Service initialized (singleton)');
  }
  return globalForMockStorage.mockStorageInstance;
}

// Export para uso directo
export const mockStorage = getMockStorage();
