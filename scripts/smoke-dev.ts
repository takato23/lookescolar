/* eslint-disable no-console */
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const previewPath = process.env.SMOKE_PREVIEW_PATH || 'unassigned/previews/example.webp';

async function main(): Promise<void> {
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    console.log('health:', health.status, await health.json());

    const photos = await fetch(`${baseUrl}/api/admin/photos`);
    console.log('photos:', photos.status);

    const signed = await fetch(`${baseUrl}/api/storage/signed-url?path=${encodeURIComponent(previewPath)}`);
    console.log('signed-url:', signed.status, await signed.json());
  } catch (error) {
    console.error('[Smoke] Error:', error);
    process.exit(1);
  }
}

void main();

