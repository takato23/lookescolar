import { describe, expect, it } from 'vitest';
import {
  getUnifiedStoreData,
  mapAssetsToPhotos,
  normalizeCatalog,
} from '@/lib/services/unified-store-data';

describe('unified store data helpers', () => {
  it('maps assets to photos with fallbacks', () => {
    const photos = mapAssetsToPhotos([
      {
        id: '1',
        preview_url: null,
        watermark_url: null,
        download_url: 'https://cdn/photos/1.jpg',
        filename: 'photo.jpg',
      },
    ]);

    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({
      id: '1',
      url: 'https://cdn/photos/1.jpg',
      alt: 'photo.jpg',
    });
  });

  it('normalizes catalog order', () => {
    const catalog = normalizeCatalog({
      items: [
        { name: 'B', sortOrder: 2 },
        { name: 'A', sortOrder: 1 },
      ],
      overrides: [
        { productId: 'p1', comboId: 'c2' },
        { productId: 'p1', comboId: 'c1' },
      ],
    });

    expect(catalog?.items.map((item) => item.name)).toEqual(['A', 'B']);
    expect(catalog?.overrides.map((o) => o.comboId)).toEqual(['c1', 'c2']);
  });

  it('throws when the store endpoint fails', async () => {
    await expect(
      getUnifiedStoreData('bad-token', {
        fetchImpl: async () =>
          new Response(
            JSON.stringify({ error: 'invalid token' }),
            { status: 404 }
          ),
      })
    ).rejects.toThrow(/invalid token/);
  });
});

