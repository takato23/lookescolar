# QR System (Unified)

This document defines the unified QR flow for student tagging. It uses a single
canonical format and a single validation pipeline across generation, scanning,
auto-detection, and anchoring.

## Canonical format

- Student tagging QR: `LKSTUDENT_<token>`
- Token: URL-safe, random, 20+ chars
- Example: `LKSTUDENT_Abc123TokenXYZ`

Legacy compatibility (temporary):
- `STUDENT:<uuid>:<name>:<eventId>` is accepted for migration only.

Note: Family access QR (gallery/checkout) is a separate flow that encodes an
access URL or `LKFAMILY_` token. It is not used for tagging.

## Entry points and responsibilities

- Generation (single source of truth):
  - `lib/services/qr.service.ts` -> `generateStudentIdentificationQR`
  - API:
    - `app/api/admin/qr/generate/route.ts`
    - `app/api/admin/events/[id]/students/route.ts`
    - `app/api/admin/events/[id]/students/bulk/route.ts`
    - `app/api/admin/courses/batch/route.ts`
- Validation/decoding:
  - `lib/services/qr.service.ts` -> `validateStudentQRCode`
  - API:
    - `app/api/qr/validate/route.ts` (shared validator)
    - `app/api/admin/qr/decode/route.ts` (admin path, same validator)
- Scanning (admin UI):
  - `components/admin/QRScanner.tsx`
  - `components/admin/QRScannerModal.tsx`
- Auto-detection on upload:
  - `lib/services/qr-detection.service.ts`
  - `app/api/admin/photos/upload/route.ts`
  - `app/api/admin/photos/qr-detect/route.ts`
  - `app/api/admin/photos/simple-upload/route.ts`
- Anchors + grouping:
  - `lib/photos/batchAnchors.ts` uses `codes.code_value` (canonical string)

## Data model and association

- `codes`
  - `code_value` = canonical QR string
  - `token` = random token
  - `qr_type` = `student_identification`
  - `student_id` (if using `students`)
  - `metadata.subject_id` (legacy `subjects`)
- `students`
  - `qr_code` = canonical QR string
  - `primary_qr_code_id` = current code id
  - `qr_status` + metadata for audit/diagnostics
- `subjects` (legacy)
  - `qr_code` = canonical QR string
- `photos`
  - `detected_qr_codes` = array of canonical strings
- `photo_students`
  - `detection_metadata` with `qr_code`, `confidence`, `source`

## When QR codes are generated

1) Student creation for an event (if QR tagging enabled).
2) Manual generation via `/api/admin/qr/generate`.
3) Batch generation for events/students/courses.

Generation always goes through `generateStudentIdentificationQR`.

## Regeneration and rotation

- Regeneration creates a new code in `codes` and updates `students.qr_code`.
- To rotate:
  1) Generate a new QR for the student.
  2) Set old `codes.is_published = false` (or mark as inactive).
  3) Update `students.primary_qr_code_id` if needed.
- Legacy compatibility remains until migration is complete.

## Scanning and tagging flow

1) Admin scans via camera or upload.
2) UI calls `/api/qr/validate` (same validator everywhere).
3) Validation resolves student by `codes` (and legacy fallback).
4) If auto-match enabled, the photo is linked in `photo_students`.

## Real-world quick guide (field use)

Visual flow:

[1] Generate QR -> [2] Print/display -> [3] First photo with QR -> [4] Upload -> [5] Auto tag

Who holds the QR:
- The person being photographed (student/guest) holds the QR card at chest
  height for 1-2 frames.
- For small kids, a teacher/assistant can hold the card next to the face.
- For groups, take a quick close-up per person with their own QR visible.

Step-by-step:
1) Generate QRs for all students/guests.
2) Print cards or show the QR on a phone/tablet.
3) Start each mini-session with a "QR frame" (clear QR, full margin).
4) Upload the batch; the system auto-tags based on the QR frame.
5) Review unmatched photos and re-scan if needed.

Printable quick guide:
- `/qr-field-guide.txt` (admin quick link)

Placement tips:
- Keep the QR flat, not angled, with a white margin around it.
- Avoid glare and motion blur; re-shoot if the QR is out of focus.
- One clear QR frame per person is usually enough.

Simple framing sketch:

+-------------------+
|       FACE        |
|                   |
|       QR          |
| (flat + margin)   |
+-------------------+

## Feature flags (toggle)

- Tenant flag: `qr_tagging_enabled`
- Event flag: `metadata.settings.qrTaggingEnabled` (or `qr_tagging_enabled`)
- Effective = tenant flag AND event flag (default true if not set).
- If disabled:
  - UI hides QR controls.
  - APIs skip detection/generation and return `qr_tagging_disabled`.

Admin settings:
- Global QR defaults live in Admin > Configuración > Codigos QR.

## Parameters (generation and print)

- Generation options:
  - `size` (px), default 200
  - `errorCorrectionLevel` (`L/M/Q/H`), default `M`
  - `margin`, default 2
- App settings defaults:
  - `qrDefaultSize` controls the default size when `size` is not provided
  - `qrDetectionSensitivity` controls detection strictness on uploads
  - `qrAutoTagOnUpload` enables/disables auto detection on upload
- Print guidance:
  - 3-4 cm QR at 300 dpi
  - High contrast, white margin, avoid glossy glare

## Performance and limits

- `app/api/admin/photos/qr-detect`:
  - Batch size: 5
  - Max 100 photos per call
- `app/api/admin/qr/detect`:
  - Max 10 images per call
- `qrDetectionService`:
  - Resizes to 1920x1080
  - Multi-rotation scan (0/90/180/270)
- Typical detection latency: ~0.5-1.5s/image (varies by size/contrast)

## Fallbacks and troubleshooting

- No QR detected:
  - Check print quality and contrast
  - Ensure margin and no cropping
  - Try re-scan with better lighting
- QR detected but not matched:
  - Code not in `codes` or `is_published=false`
  - Event mismatch in validator call
- QR tagging disabled:
  - Enable tenant flag and event flag
- Duplicate or stale QR:
  - Regenerate and deactivate previous code

## Migration plan (legacy to canonical)

1) Keep `STUDENT:<uuid>:<name>:<eventId>` accepted temporarily.
2) Generate canonical QR for all active students via batch endpoint.
3) Update PDFs/print assets to use canonical codes only.
4) After adoption, disable legacy format support.
