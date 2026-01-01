export const STUDENT_QR_PREFIX = 'LKSTUDENT_';

const LEGACY_STUDENT_QR_PATTERN =
  /^STUDENT:([a-f0-9-]{36}):([^:]+):([a-f0-9-]{36})$/i;

const CANONICAL_STUDENT_QR_PATTERN = /LKSTUDENT_([A-Za-z0-9_-]+)/i;

export type ParsedStudentQR =
  | {
      kind: 'canonical';
      codeValue: string;
      token: string;
    }
  | {
      kind: 'legacy';
      studentId: string;
      studentName?: string;
      eventId?: string;
    };

export function parseStudentQRCode(input: string): ParsedStudentQR | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const canonicalMatch = trimmed.match(CANONICAL_STUDENT_QR_PATTERN);
  if (canonicalMatch) {
    const token = canonicalMatch[1];
    return {
      kind: 'canonical',
      token,
      codeValue: `${STUDENT_QR_PREFIX}${token}`,
    };
  }

  const legacyMatch = trimmed.match(LEGACY_STUDENT_QR_PATTERN);
  if (legacyMatch) {
    const [, studentId, studentName, eventId] = legacyMatch;
    return {
      kind: 'legacy',
      studentId,
      studentName: studentName?.replace(/_/g, ' ').trim(),
      eventId,
    };
  }

  return null;
}

export function normalizeStudentQRCodeValue(input: string): string | null {
  const parsed = parseStudentQRCode(input);
  if (!parsed || parsed.kind !== 'canonical') return null;
  return parsed.codeValue;
}
