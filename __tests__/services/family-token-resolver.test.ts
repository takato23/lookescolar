import {
  resolveFamilyToken,
  FamilyTokenResolutionError,
} from '@/lib/services/family-token-resolver';

global.fetch = jest.fn();

describe('resolveFamilyToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves alias to underlying token and validation payload', async () => {
    const aliasPayload = {
      alias: 'luna1234',
      short_code: 'LU12',
      token: 'token-abc1234567890',
      token_id: 'token-id-1',
    };
    const validationPayload = {
      valid: true,
      access_level: 'family',
      event: {
        id: 'event-001',
        name: 'Festival Primavera',
      },
      family: {
        email: 'family@example.com',
        students: [],
        event: {
          id: 'event-001',
          name: 'Festival Primavera',
        },
      },
      permissions: {
        can_view_photos: true,
        can_download_previews: true,
        can_purchase: true,
        can_share: true,
        max_devices: 3,
        device_fingerprint_required: false,
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => aliasPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validationPayload,
      });

    const result = await resolveFamilyToken('Luna1234');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/family/alias/Luna1234',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      `/api/family/validate-token/enhanced/${encodeURIComponent(
        aliasPayload.token
      )}`,
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(result.source).toBe('alias');
    expect(result.token).toBe(aliasPayload.token);
    expect(result.alias?.alias).toBe('luna1234');
    expect(result.validation.valid).toBe(true);
  });

  it('resolves direct token without alias lookup', async () => {
    const validationPayload = {
      valid: true,
      access_level: 'student',
      event: {
        id: 'event-002',
        name: 'Acto escolar',
      },
      student: {
        id: 'student-1',
        name: 'Maria Gomez',
        event: {
          id: 'event-002',
          name: 'Acto escolar',
        },
      },
      permissions: {
        can_view_photos: true,
        can_download_previews: true,
        can_purchase: true,
        can_share: false,
        max_devices: 3,
        device_fingerprint_required: false,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => validationPayload,
    });

    const tokenValue = 'token-xyz9876543210';
    const result = await resolveFamilyToken(tokenValue);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/family/validate-token/enhanced/${encodeURIComponent(tokenValue)}`,
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(result.source).toBe('token');
    expect(result.token).toBe(tokenValue);
    expect(result.validation.valid).toBe(true);
  });

  it('throws a FamilyTokenResolutionError when alias is not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'Alias no encontrado',
        error_code: 'ALIAS_NOT_FOUND',
      }),
    });

    let capturedError: unknown;
    try {
      await resolveFamilyToken('desconocido');
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(FamilyTokenResolutionError);
    expect(
      (capturedError as FamilyTokenResolutionError).code
    ).toBe('ALIAS_NOT_FOUND');
  });
});
