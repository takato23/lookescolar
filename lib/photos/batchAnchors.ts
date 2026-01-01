import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { decodeQR, extractEXIFDate, normalizeCode } from '@/lib/qr/decoder';
import pLimit from 'p-limit';

type RunOpts = {
  eventId: string;
  maxConcurrency?: number;
  onlyMissing?: boolean;
};

export async function detectAnchorsRun({
  eventId,
  maxConcurrency = 4,
  onlyMissing = true,
}: RunOpts) {
  const supabase = await createServerSupabaseServiceClient();

  const { data: photos, error } = await (supabase as any)
    .from('photos')
    .select('id, storage_path, code_id, is_anchor, anchor_raw, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const targets = (photos ?? []).filter((p: any) =>
    onlyMissing ? !p.is_anchor && !p.code_id : true
  );

  const { data: codes } = await (supabase as any)
    .from('codes')
    .select('id, code_value')
    .eq('event_id', eventId);
  const codeMap = new Map<string, string>();
  (codes ?? []).forEach((c: any) =>
    codeMap.set(String(c.code_value), c.id)
  );

  const limit = pLimit(maxConcurrency);
  const results: {
    detected: Array<{ photo_id: string; code_value: string; code_id: string }>;
    unmatched: Array<{ photo_id: string; code_value: string }>;
    errors: Array<{ photo_id: string; error: string }>;
    updatedExif: number;
  } = { detected: [], unmatched: [], errors: [], updatedExif: 0 };

  await Promise.all(
    targets.map((p: any) =>
      limit(async () => {
        try {
          const buf = await downloadFromStorage(supabase, p.storage_path);

          const exifDate = await extractEXIFDate(buf);
          if (exifDate) {
            await (supabase as any)
              .from('photos')
              .update({ exif_taken_at: exifDate.toISOString() })
              .eq('id', p.id);
            results.updatedExif++;
          }

          const qr = await decodeQR(buf);
          const codeVal = normalizeCode(qr?.text);
          if (!codeVal) return;

          const codeId = codeMap.get(codeVal) ?? null;
          if (codeId) {
            await (supabase as any)
              .from('photos')
              .update({ is_anchor: true, anchor_raw: codeVal, code_id: codeId })
              .eq('id', p.id);
            results.detected.push({
              photo_id: p.id,
              code_value: codeVal,
              code_id: codeId,
            });
          } else {
            await (supabase as any)
              .from('photos')
              .update({ is_anchor: true, anchor_raw: codeVal })
              .eq('id', p.id);
            results.unmatched.push({ photo_id: p.id, code_value: codeVal });
          }
        } catch (e: any) {
          results.errors.push({
            photo_id: p.id,
            error: e?.message ?? String(e),
          });
        }
      })
    )
  );

  return results;
}

async function downloadFromStorage(
  supabase: any,
  storagePath: string
): Promise<Buffer> {
  const bucket =
    process.env['STORAGE_BUCKET_ORIGINAL'] ||
    process.env['STORAGE_BUCKET'] ||
    'photo-private';
  const path = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;

  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) {
      console.error(`Error downloading ${path} from bucket ${bucket}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
    if (!data) {
      throw new Error('No data received from storage');
    }
    const arrBuf = await data.arrayBuffer();
    return Buffer.from(arrBuf);
  } catch (err) {
    console.error(`Storage download error for ${path}:`, err);
    throw err;
  }
}
