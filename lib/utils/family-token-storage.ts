'use client';

const STORAGE_KEY = 'lookescolar.family.access.token';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretSeed = `${window.location.host}|lookescolar-family-access|v1`;
  const rawKey = await window.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(secretSeed)
  );
  return window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function storeFamilyToken(token: string): Promise<void> {
  if (typeof window === 'undefined' || !token) return;

  try {
    if (!window.crypto?.subtle) {
      const encoded = btoa(token);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: 1, data: encoded })
      );
      return;
    }

    const key = await deriveKey();
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(token)
    );

    const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.byteLength);

    const payload = arrayBufferToBase64(combined.buffer);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 2, data: payload })
    );
  } catch (error) {
    console.warn('[FamilyTokenStorage] Encryption failed, falling back to base64', error);
    const encoded = btoa(token);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, data: encoded })
    );
  }
}

export async function loadFamilyToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: number; data: string };

    if (parsed.v === 2 && window.crypto?.subtle) {
      const key = await deriveKey();
      const combinedBuffer = base64ToArrayBuffer(parsed.data);
      const combined = new Uint8Array(combinedBuffer);
      const iv = combined.slice(0, 12);
      const cipher = combined.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipher
      );
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    }

    if (parsed.v === 1 && parsed.data) {
      return atob(parsed.data);
    }
  } catch (error) {
    console.warn('[FamilyTokenStorage] Failed to load token from storage', error);
  }

  return null;
}

export function clearFamilyToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
