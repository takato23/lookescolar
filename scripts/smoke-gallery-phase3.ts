#!/usr/bin/env tsx

const baseUrl = process.env['SMOKE_BASE_URL'] || process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
const familyToken = process.env['GALLERY_FAMILY_TOKEN'];
const shareToken = process.env['GALLERY_SHARE_TOKEN'];
const storeToken = process.env['GALLERY_STORE_TOKEN'];
const abortOnError = process.env['SMOKE_ABORT_ON_ERROR'] !== '0';

interface SmokeResult {
  name: string;
  ok: boolean;
  status: number;
  message: string;
}

async function fetchJson(path: string) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep json null
  }
  return { response, json, raw: text };
}

async function runFamily(): Promise<SmokeResult> {
  if (!familyToken) {
    return {
      name: 'family-gallery',
      ok: false,
      status: 0,
      message: 'GALLERY_FAMILY_TOKEN no configurado',
    };
  }
  const { response, json } = await fetchJson(`/api/family/gallery/${familyToken}?page=1&limit=5`);
  const ok = response.ok && json && json.data?.gallery?.items?.length >= 0;
  const message = ok
    ? `OK (${json.data.gallery.items.length} items)`
    : `Error ${response.status} -> ${JSON.stringify(json)}`;
  return { name: 'family-gallery', ok, status: response.status, message };
}

async function runShare(): Promise<SmokeResult> {
  if (!shareToken) {
    return {
      name: 'public-share-gallery',
      ok: false,
      status: 0,
      message: 'GALLERY_SHARE_TOKEN no configurado',
    };
  }
  const { response, json } = await fetchJson(`/api/public/share/${shareToken}/gallery?page=1&limit=5`);
  const ok = response.ok && json && json.gallery?.items?.length >= 0;
  const message = ok
    ? `OK (${json.gallery.items.length} items)`
    : `Error ${response.status} -> ${JSON.stringify(json)}`;
  return { name: 'public-share-gallery', ok, status: response.status, message };
}

async function runStore(): Promise<SmokeResult> {
  if (!storeToken) {
    return {
      name: 'public-store',
      ok: false,
      status: 0,
      message: 'GALLERY_STORE_TOKEN no configurado',
    };
  }
  const { response, json } = await fetchJson(`/api/store/${storeToken}?include_assets=true&limit=5&offset=0`);
  const hasGallery = Boolean(json?.gallery?.items);
  const ok = response.ok && (json?.assets || []).length >= 0 && hasGallery;
  const message = ok
    ? `OK (${(json.assets || []).length} assets, gallery items ${(json.gallery?.items || []).length})`
    : `Error ${response.status} -> ${JSON.stringify(json)}`;
  return { name: 'public-store', ok, status: response.status, message };
}

async function main() {
  const runners = [runFamily, runShare, runStore];
  const results: SmokeResult[] = [];
  for (const runner of runners) {
    const res = await runner();
    results.push(res);
    const statusLabel = res.ok ? '✅' : '❌';
    console.log(`${statusLabel} ${res.name}: ${res.message}`);
    if (!res.ok && abortOnError) {
      console.error('Abortando smoke-tests debido a fallo. Usa SMOKE_ABORT_ON_ERROR=0 para continuar.');
      process.exit(1);
    }
  }

  const missing = results.filter((r) => r.status === 0);
  if (missing.length) {
    console.warn('⚠️ Tokens no configurados:', missing.map((r) => r.name).join(', '));
  }

  const failures = results.filter((r) => !r.ok && r.status !== 0);
  if (failures.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error ejecutando smoke-gallery-phase3:', error);
  process.exit(1);
});
