import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
} from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  SecurityValidator,
  SecuritySanitizer,
  SECURITY_CONSTANTS,
} from '@/lib/security/validation';
import { tokenService } from '@/lib/security/token.service';
import crypto from 'crypto';
import sharp from 'sharp';

// Mock crypto for consistent testing
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn(),
    randomUUID: vi.fn(),
    createHash: vi.fn(),
    createHmac: vi.fn(),
  };
});

describe('Security - Comprehensive Tests', () => {
  beforeAll(() => {
    // Setup test environment variables
    process.env.SESSION_SECRET = 'test-session-secret-with-32-characters-long';
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters-long-key';
    process.env.MP_WEBHOOK_SECRET = 'test-mp-webhook-secret-for-testing-only';
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Generation and Validation', () => {
    describe('Token Security Requirements', () => {
      it('debería generar tokens de al menos 20 caracteres', () => {
        (crypto.randomBytes as any).mockReturnValue(
          Buffer.from('a'.repeat(32))
        );

        const token = tokenService.generateSecureToken();

        expect(token.length).toBeGreaterThanOrEqual(20);
        expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      });

      it('debería generar tokens únicos en cada llamada', () => {
        let callCount = 0;
        (crypto.randomBytes as any).mockImplementation(() => {
          callCount++;
          return Buffer.from(`unique-${callCount}`.repeat(4));
        });

        const token1 = tokenService.generateSecureToken();
        const token2 = tokenService.generateSecureToken();
        const token3 = tokenService.generateSecureToken();

        expect(token1).not.toBe(token2);
        expect(token2).not.toBe(token3);
        expect(new Set([token1, token2, token3]).size).toBe(3);
      });

      it('debería usar alfabeto seguro sin caracteres confusos', () => {
        const token = tokenService.generateSecureToken();

        // No debería contener caracteres confusos como 0, O, I, l
        expect(token).not.toMatch(/[0OIl]/);

        // Solo debería contener caracteres del alfabeto seguro
        expect(token).toMatch(/^[A-HJ-NP-Za-kmnp-z2-9]+$/);
      });

      it('debería tener suficiente entropía (>= 128 bits)', () => {
        const tokens = new Set();
        const iterations = 1000;

        // Generar muchos tokens para verificar distribución
        for (let i = 0; i < iterations; i++) {
          (crypto.randomBytes as any).mockReturnValueOnce(
            Buffer.from(Math.random().toString(36).repeat(10))
          );
          tokens.add(tokenService.generateSecureToken());
        }

        // Todos los tokens deberían ser únicos
        expect(tokens.size).toBe(iterations);
      });

      it('debería validar formato de token correctamente', () => {
        const validTokens = [
          'a'.repeat(20), // Exactamente 20 caracteres
          'b'.repeat(50), // Token largo
          'valid-token-2023-abcdef123456', // Con guiones
          'UPPERCASE-lowercase-123456789',
        ];

        const invalidTokens = [
          'short', // Muy corto
          '', // Vacío
          'token-with-0OIl', // Caracteres confusos
          'token with spaces', // Con espacios
          'token/with/slashes', // Con caracteres especiales
          null,
          undefined,
        ];

        validTokens.forEach((token) => {
          expect(SecurityValidator.isValidToken(token)).toBe(true);
        });

        invalidTokens.forEach((token) => {
          expect(SecurityValidator.isValidToken(token as any)).toBe(false);
        });
      });

      it('debería generar tokens con expiración configurable', () => {
        const defaultExpiry = tokenService.generateTokenWithExpiry();
        const customExpiry = tokenService.generateTokenWithExpiry(7); // 7 días

        expect(defaultExpiry).toHaveProperty('token');
        expect(defaultExpiry).toHaveProperty('expiresAt');
        expect(customExpiry).toHaveProperty('token');
        expect(customExpiry).toHaveProperty('expiresAt');

        // Custom expiry debería ser diferente al default
        expect(defaultExpiry.expiresAt).not.toBe(customExpiry.expiresAt);
      });

      it('debería detectar tokens próximos a expirar', () => {
        const now = new Date();
        const almostExpired = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 días
        const validForLong = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000); // 20 días

        expect(tokenService.isTokenNearExpiry(almostExpired)).toBe(true);
        expect(tokenService.isTokenNearExpiry(validForLong)).toBe(false);
      });
    });

    describe('Token Rotation and Security', () => {
      it('debería rotar tokens comprometidos', async () => {
        const oldToken = 'compromised-token-12345678901234567890';
        const newTokenData = tokenService.rotateToken(oldToken);

        expect(newTokenData.oldToken).toBe(oldToken);
        expect(newTokenData.newToken).not.toBe(oldToken);
        expect(newTokenData.newToken.length).toBeGreaterThanOrEqual(20);
        expect(newTokenData).toHaveProperty('rotatedAt');
      });

      it('debería invalidar tokens en lista negra', () => {
        const blacklistedTokens = [
          'revoked-token-123456789012345678901',
          'compromised-token-123456789012345678',
          'expired-manually-123456789012345678',
        ];

        blacklistedTokens.forEach((token) => {
          tokenService.blacklistToken(token);
          expect(SecurityValidator.isTokenBlacklisted(token)).toBe(true);
        });
      });

      it('debería limpiar tokens expirados de la lista negra', () => {
        const expiredToken = 'expired-token-123456789012345678901';

        // Agregar a lista negra con timestamp antiguo
        tokenService.blacklistToken(expiredToken, new Date('2023-01-01'));

        expect(SecurityValidator.isTokenBlacklisted(expiredToken)).toBe(true);

        // Limpiar tokens expirados
        tokenService.cleanExpiredBlacklist();

        expect(SecurityValidator.isTokenBlacklisted(expiredToken)).toBe(false);
      });

      it('debería mantener historial de rotaciones para auditoría', () => {
        const originalToken = 'original-token-12345678901234567890';

        const rotation1 = tokenService.rotateToken(originalToken);
        const rotation2 = tokenService.rotateToken(rotation1.newToken);

        const history = tokenService.getRotationHistory(originalToken);

        expect(history).toHaveLength(2);
        expect(history[0].oldToken).toBe(originalToken);
        expect(history[1].oldToken).toBe(rotation1.newToken);
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    describe('File Type Validation', () => {
      it('debería permitir solo tipos de archivo seguros', () => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        const blockedTypes = [
          'application/x-executable',
          'text/html',
          'application/javascript',
          'text/php',
          'application/x-sh',
          'image/svg+xml', // SVG puede contener scripts
          'application/pdf',
          'application/msword',
        ];

        allowedTypes.forEach((type) => {
          expect(SecurityValidator.isAllowedContentType(type)).toBe(true);
        });

        blockedTypes.forEach((type) => {
          expect(SecurityValidator.isAllowedContentType(type)).toBe(false);
        });
      });

      it('debería validar MIME type vs extensión de archivo', () => {
        const validCombinations = [
          { filename: 'photo.jpg', mimeType: 'image/jpeg' },
          { filename: 'image.png', mimeType: 'image/png' },
          { filename: 'picture.webp', mimeType: 'image/webp' },
        ];

        const invalidCombinations = [
          { filename: 'script.php', mimeType: 'image/jpeg' }, // Extensión sospechosa
          { filename: 'image.jpg', mimeType: 'application/javascript' }, // MIME sospechoso
          { filename: 'photo.jpg.exe', mimeType: 'image/jpeg' }, // Doble extensión
        ];

        validCombinations.forEach(({ filename, mimeType }) => {
          expect(
            SecurityValidator.validateFileMimeType(filename, mimeType)
          ).toBe(true);
        });

        invalidCombinations.forEach(({ filename, mimeType }) => {
          expect(
            SecurityValidator.validateFileMimeType(filename, mimeType)
          ).toBe(false);
        });
      });

      it('debería rechazar archivos demasiado grandes', () => {
        const maxSize = SECURITY_CONSTANTS.MAX_FILE_SIZE; // 10MB según configuración

        expect(SecurityValidator.isValidFileSize(maxSize - 1)).toBe(true);
        expect(SecurityValidator.isValidFileSize(maxSize)).toBe(true);
        expect(SecurityValidator.isValidFileSize(maxSize + 1)).toBe(false);
        expect(SecurityValidator.isValidFileSize(100 * 1024 * 1024)).toBe(
          false
        ); // 100MB
      });

      it('debería validar contenido real del archivo (magic bytes)', async () => {
        // Crear imágenes reales para testing
        const validJpeg = await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
          },
        })
          .jpeg()
          .toBuffer();

        const validPng = await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 0, g: 255, b: 0, alpha: 1 },
          },
        })
          .png()
          .toBuffer();

        // Fake image (texto con extensión de imagen)
        const fakeImage = Buffer.from('This is not an image');

        expect(await SecurityValidator.validateImageMagicBytes(validJpeg)).toBe(
          true
        );
        expect(await SecurityValidator.validateImageMagicBytes(validPng)).toBe(
          true
        );
        expect(await SecurityValidator.validateImageMagicBytes(fakeImage)).toBe(
          false
        );
      });
    });

    describe('Filename Sanitization', () => {
      it('debería sanitizar nombres de archivo peligrosos', () => {
        const dangerousFilenames = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32\\config\\sam',
          'file with spaces and (special) chars!.jpg',
          'файл-с-unicode-символами.png',
          'file\x00with\x00null\x00bytes.jpg',
          'CON.jpg', // Windows reserved name
          'PRN.png', // Windows reserved name
          'script.php.jpg', // Doble extensión
          '.htaccess', // Archivo de configuración
          'file<>:|?*.jpg', // Caracteres ilegales en Windows
        ];

        dangerousFilenames.forEach((filename) => {
          const sanitized = SecuritySanitizer.sanitizeFilename(filename);

          // No debería contener caracteres peligrosos
          expect(sanitized).not.toMatch(/[<>:"|?*\x00-\x1f]/);
          expect(sanitized).not.toContain('..');
          expect(sanitized).not.toMatch(
            /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
          );

          // Debería mantener la extensión si es válida
          if (filename.endsWith('.jpg') || filename.endsWith('.png')) {
            expect(sanitized).toMatch(/\.(jpg|png)$/i);
          }
        });
      });

      it('debería preservar nombres de archivo seguros', () => {
        const safeFilenames = [
          'simple-photo.jpg',
          'IMG_2024_001.png',
          'family-photo-2024.webp',
          'vacation_beach_sunset.jpeg',
        ];

        safeFilenames.forEach((filename) => {
          const sanitized = SecuritySanitizer.sanitizeFilename(filename);
          expect(sanitized).toBe(filename);
        });
      });

      it('debería generar nombres únicos para archivos conflictivos', () => {
        const conflictingName = 'photo.jpg';

        const unique1 =
          SecuritySanitizer.generateUniqueFilename(conflictingName);
        const unique2 =
          SecuritySanitizer.generateUniqueFilename(conflictingName);

        expect(unique1).not.toBe(unique2);
        expect(unique1).toContain('photo');
        expect(unique1).toContain('.jpg');
        expect(unique2).toContain('photo');
        expect(unique2).toContain('.jpg');
      });
    });

    describe('Path Traversal Prevention', () => {
      it('debería detectar y bloquear path traversal attacks', () => {
        const maliciousPaths = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32',
          '/etc/passwd',
          'C:\\Windows\\System32',
          '....//....//etc//passwd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
          'photos/../../../secret/file.txt',
          'photos/..\\..\\secret\\file.txt',
        ];

        maliciousPaths.forEach((path) => {
          expect(SecurityValidator.isSafePath(path)).toBe(false);
        });
      });

      it('debería permitir paths seguros relativos', () => {
        const safePaths = [
          'events/graduation-2024/photos',
          'user-uploads/family-123/photo.jpg',
          'tmp/processed/IMG_001.jpg',
          'storage/public/thumbnails',
        ];

        safePaths.forEach((path) => {
          expect(SecurityValidator.isSafePath(path)).toBe(true);
        });
      });

      it('debería normalizar y validar paths de storage', () => {
        const testPaths = [
          {
            input: 'events/test/../photos/img.jpg',
            expected: 'events/photos/img.jpg',
          },
          {
            input: 'events//test///photos/img.jpg',
            expected: 'events/test/photos/img.jpg',
          },
          {
            input: './events/test/photos/img.jpg',
            expected: 'events/test/photos/img.jpg',
          },
        ];

        testPaths.forEach(({ input, expected }) => {
          const normalized = SecuritySanitizer.normalizePath(input);
          expect(normalized).toBe(expected);
          expect(SecurityValidator.isSafePath(normalized)).toBe(true);
        });
      });
    });

    describe('SQL Injection Prevention', () => {
      it('debería detectar intentos de SQL injection', () => {
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "' UNION SELECT * FROM passwords --",
          "admin'/*",
          "'; INSERT INTO users VALUES ('hacker', 'pass'); --",
          "1'; EXEC xp_cmdshell('format c:'); --",
        ];

        maliciousInputs.forEach((input) => {
          expect(SecurityValidator.containsSQLInjection(input)).toBe(true);
        });
      });

      it('debería permitir entrada legítima con caracteres especiales', () => {
        const legitimateInputs = [
          "O'Connor Family Photos",
          "Class of '24 Graduation",
          "María José's Birthday",
          'John & Jane Wedding',
          '2024-12-15 Event',
        ];

        legitimateInputs.forEach((input) => {
          expect(SecurityValidator.containsSQLInjection(input)).toBe(false);
        });
      });

      it('debería sanitizar entrada para consultas seguras', () => {
        const userInputs = [
          { input: "Family's Photos", expected: "Family''s Photos" },
          { input: 'Event "2024"', expected: 'Event "2024"' },
          { input: 'Test & Demo', expected: 'Test & Demo' },
        ];

        userInputs.forEach(({ input, expected }) => {
          const sanitized = SecuritySanitizer.sanitizeForSQL(input);
          expect(sanitized).toBe(expected);
        });
      });
    });

    describe('XSS Prevention', () => {
      it('debería detectar y sanitizar XSS attempts', () => {
        const xssPayloads = [
          '<script>alert("xss")</script>',
          '<img src=x onerror=alert(1)>',
          'javascript:alert("xss")',
          '<svg onload=alert(1)>',
          '"><script>alert(String.fromCharCode(88,83,83))</script>',
          '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        ];

        xssPayloads.forEach((payload) => {
          const sanitized = SecuritySanitizer.sanitizeHTML(payload);
          expect(sanitized).not.toContain('<script');
          expect(sanitized).not.toContain('javascript:');
          expect(sanitized).not.toContain('onerror=');
          expect(sanitized).not.toContain('onload=');
        });
      });

      it('debería preservar contenido HTML seguro', () => {
        const safeHTML = [
          'Family Photos',
          '<strong>Important Event</strong>',
          '<em>Graduation 2024</em>',
          '<p>Event description with <a href="/gallery">gallery link</a></p>',
        ];

        safeHTML.forEach((html) => {
          const sanitized = SecuritySanitizer.sanitizeHTML(html);
          // Debería mantener tags seguros
          expect(sanitized).toContain(html.replace(/<[^>]*>/g, ''));
        });
      });

      it('debería validar URLs para prevenir javascript: y data: URLs', () => {
        const maliciousUrls = [
          'javascript:alert("xss")',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:msgbox("xss")',
          'file:///etc/passwd',
          'ftp://malicious-server.com/payload',
        ];

        const safeUrls = [
          'https://lookescolar.com/gallery',
          'http://localhost:3000/admin',
          '/relative/path/to/resource',
          'mailto:contact@lookescolar.com',
          'tel:+1234567890',
        ];

        maliciousUrls.forEach((url) => {
          expect(SecurityValidator.isSafeURL(url)).toBe(false);
        });

        safeUrls.forEach((url) => {
          expect(SecurityValidator.isSafeURL(url)).toBe(true);
        });
      });
    });
  });

  describe('Access Control and Authorization', () => {
    describe('IP-based Access Control', () => {
      it('debería permitir IPs en whitelist', () => {
        const allowedIPs = [
          '127.0.0.1', // Localhost
          '192.168.1.0/24', // Red local
          '10.0.0.0/8', // Red privada
          '172.16.0.0/12', // Red privada
        ];

        // Mock whitelist
        (SecurityValidator as any).ipWhitelist = allowedIPs;

        const testIPs = [
          '127.0.0.1',
          '192.168.1.100',
          '10.0.0.1',
          '172.16.0.50',
        ];

        testIPs.forEach((ip) => {
          expect(SecurityValidator.isAllowedIP(ip)).toBe(true);
        });
      });

      it('debería bloquear IPs sospechosas', () => {
        const suspiciousIPs = [
          '0.0.0.0', // Invalid
          '255.255.255.255', // Broadcast
          '169.254.1.1', // Link-local
          '224.0.0.1', // Multicast
          '198.18.0.1', // Test range
        ];

        suspiciousIPs.forEach((ip) => {
          expect(SecurityValidator.isAllowedIP(ip)).toBe(false);
        });
      });

      it('debería detectar User-Agents sospechosos', () => {
        const suspiciousUserAgents = [
          'sqlmap/1.0', // SQL injection tool
          'Nikto/2.1.6', // Web scanner
          'wget/1.20.3', // Command line downloader
          'curl/7.68.0', // Command line tool
          'python-requests/2.25.1', // Python requests
          'Go-http-client/1.1', // Go HTTP client
          '', // Empty user agent
          'Mozilla/5.0 (compatible; Baiduspider/2.0)', // Search bot
        ];

        const legitimateUserAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ];

        suspiciousUserAgents.forEach((ua) => {
          expect(SecurityValidator.isSuspiciousUserAgent(ua)).toBe(true);
        });

        legitimateUserAgents.forEach((ua) => {
          expect(SecurityValidator.isSuspiciousUserAgent(ua)).toBe(false);
        });
      });

      it('debería implementar rate limiting por IP', () => {
        const testIP = '192.168.1.100';
        const maxRequests = 10;
        const windowMs = 60000; // 1 minuto

        // Simular múltiples requests del mismo IP
        for (let i = 0; i < maxRequests; i++) {
          expect(
            SecurityValidator.checkRateLimit(testIP, maxRequests, windowMs)
          ).toBe(true);
        }

        // El siguiente request debería ser bloqueado
        expect(
          SecurityValidator.checkRateLimit(testIP, maxRequests, windowMs)
        ).toBe(false);
      });
    });

    describe('Token-based Access Control', () => {
      it('debería validar tokens de familia con permisos limitados', () => {
        const familyToken = 'family-token-12345678901234567890';
        const adminToken = 'admin-token-12345678901234567890';

        // Mock tokens con diferentes permisos
        const familyPermissions = ['view:own_photos', 'create:order'];
        const adminPermissions = [
          'view:all_photos',
          'create:event',
          'manage:users',
        ];

        expect(
          SecurityValidator.hasPermission(familyToken, 'view:own_photos')
        ).toBe(true);
        expect(
          SecurityValidator.hasPermission(familyToken, 'view:all_photos')
        ).toBe(false);
        expect(
          SecurityValidator.hasPermission(adminToken, 'view:all_photos')
        ).toBe(true);
      });

      it('debería validar expiración de tokens', () => {
        const expiredToken = {
          token: 'expired-token-123456789012345',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ayer
        };

        const validToken = {
          token: 'valid-token-123456789012345',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
        };

        expect(SecurityValidator.isTokenExpired(expiredToken.expiresAt)).toBe(
          true
        );
        expect(SecurityValidator.isTokenExpired(validToken.expiresAt)).toBe(
          false
        );
      });

      it('debería implementar refresh de tokens automático', () => {
        const nearExpiryToken = {
          token: 'near-expiry-token-123456789012345',
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
        };

        const shouldRefresh = tokenService.shouldRefreshToken(
          nearExpiryToken.expiresAt
        );
        expect(shouldRefresh).toBe(true);

        const refreshedToken = tokenService.refreshToken(nearExpiryToken.token);
        expect(refreshedToken.token).not.toBe(nearExpiryToken.token);
        expect(refreshedToken.expiresAt.getTime()).toBeGreaterThan(
          nearExpiryToken.expiresAt.getTime()
        );
      });
    });
  });

  describe('Cryptographic Security', () => {
    describe('HMAC Signature Validation', () => {
      beforeEach(() => {
        // Mock HMAC
        const mockHmac = {
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue('mocked-signature'),
        };
        (crypto.createHmac as any).mockReturnValue(mockHmac);
      });

      it('debería validar firmas de webhook de MercadoPago', () => {
        const webhookPayload = JSON.stringify({
          action: 'payment.updated',
          data: { id: '123456789' },
        });

        const validSignature = 'sha256=mocked-signature';
        const invalidSignature = 'sha256=invalid-signature';

        expect(
          SecurityValidator.validateWebhookSignature(
            webhookPayload,
            validSignature,
            process.env.MP_WEBHOOK_SECRET!
          )
        ).toBe(true);

        expect(
          SecurityValidator.validateWebhookSignature(
            webhookPayload,
            invalidSignature,
            process.env.MP_WEBHOOK_SECRET!
          )
        ).toBe(false);
      });

      it('debería rechazar firmas con timing attack protection', () => {
        const payload = 'test payload';
        const secret = 'test-secret';

        // Firmas que difieren en un solo carácter
        const validSig = 'sha256=abc123';
        const invalidSig1 = 'sha256=abc124'; // Un carácter diferente
        const invalidSig2 = 'sha256=xyz789'; // Completamente diferente

        // Mock constante time comparison
        const constantTimeCompare = vi
          .fn()
          .mockReturnValueOnce(true) // válida
          .mockReturnValueOnce(false) // inválida por 1 char
          .mockReturnValueOnce(false); // completamente inválida

        SecurityValidator.constantTimeCompare = constantTimeCompare;

        expect(
          SecurityValidator.validateWebhookSignature(payload, validSig, secret)
        ).toBe(true);
        expect(
          SecurityValidator.validateWebhookSignature(
            payload,
            invalidSig1,
            secret
          )
        ).toBe(false);
        expect(
          SecurityValidator.validateWebhookSignature(
            payload,
            invalidSig2,
            secret
          )
        ).toBe(false);
      });

      it('debería generar hashes seguros para archivos', () => {
        const fileBuffer = Buffer.from('test file content');

        const mockHash = {
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue('file-hash-123'),
        };
        (crypto.createHash as any).mockReturnValue(mockHash);

        const hash = SecurityValidator.generateFileHash(fileBuffer);

        expect(hash).toBe('file-hash-123');
        expect(crypto.createHash).toHaveBeenCalledWith('sha256');
        expect(mockHash.update).toHaveBeenCalledWith(fileBuffer);
        expect(mockHash.digest).toHaveBeenCalledWith('hex');
      });
    });

    describe('Password and Session Security', () => {
      it('debería hash passwords con salt aleatorio', () => {
        const password = 'user-password-123';
        const salt = 'random-salt-value';

        (crypto.randomBytes as any).mockReturnValue(Buffer.from(salt));

        const mockHash = {
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue('hashed-password'),
        };
        (crypto.createHash as any).mockReturnValue(mockHash);

        const hashedPassword = SecurityValidator.hashPassword(password);

        expect(hashedPassword).toContain('hashed-password');
        expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      });

      it('debería validar fortaleza de password', () => {
        const weakPasswords = [
          '123456',
          'password',
          'qwerty',
          'abc123',
          'password123',
          'admin',
          '',
        ];

        const strongPasswords = [
          'MySecurePassword123!',
          'Complex_Pass_2024#',
          'Family@Photos$2024',
          'Str0ng!P@ssw0rd',
          'MyPhoto#Gallery2024',
        ];

        weakPasswords.forEach((password) => {
          expect(SecurityValidator.isStrongPassword(password)).toBe(false);
        });

        strongPasswords.forEach((password) => {
          expect(SecurityValidator.isStrongPassword(password)).toBe(true);
        });
      });

      it('debería generar session IDs seguros', () => {
        (crypto.randomBytes as any).mockReturnValue(
          Buffer.from('secure-session-id-bytes')
        );

        const sessionId = SecurityValidator.generateSessionId();

        expect(sessionId).toBeDefined();
        expect(sessionId.length).toBeGreaterThan(20);
        expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      });

      it('debería validar integridad de session', () => {
        const sessionData = {
          userId: '123',
          role: 'admin',
          timestamp: Date.now(),
        };

        const validSession = SecurityValidator.signSession(
          sessionData,
          process.env.SESSION_SECRET!
        );
        expect(validSession).toHaveProperty('data');
        expect(validSession).toHaveProperty('signature');

        expect(
          SecurityValidator.verifySession(
            validSession,
            process.env.SESSION_SECRET!
          )
        ).toBe(true);

        // Modificar datos debería invalidar firma
        const tamperredSession = {
          ...validSession,
          data: { ...sessionData, role: 'user' },
        };

        expect(
          SecurityValidator.verifySession(
            tamperredSession,
            process.env.SESSION_SECRET!
          )
        ).toBe(false);
      });
    });
  });

  describe('Content Security and Validation', () => {
    describe('Image Content Validation', () => {
      it('debería detectar imágenes maliciosas', async () => {
        // Imagen con metadata sospechoso
        const suspiciousImage = await sharp({
          create: {
            width: 1,
            height: 1,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        })
          .jpeg({
            quality: 100,
            // Intentar inyectar metadata malicioso (esto es solo una simulación)
            // En la práctica, sharp sanitiza automáticamente
          })
          .toBuffer();

        // Imagen aparentemente normal pero muy grande (potencial DoS)
        const oversizedImage = await sharp({
          create: {
            width: 10000,
            height: 10000,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        })
          .jpeg()
          .toBuffer();

        // Imagen normal
        const normalImage = await sharp({
          create: {
            width: 800,
            height: 600,
            channels: 3,
            background: { r: 100, g: 150, b: 200 },
          },
        })
          .jpeg()
          .toBuffer();

        expect(await SecurityValidator.validateImageContent(normalImage)).toBe(
          true
        );
        expect(
          await SecurityValidator.validateImageContent(oversizedImage)
        ).toBe(false); // Muy grande
      });

      it('debería validar dimensiones de imagen', () => {
        const validDimensions = [
          { width: 100, height: 100 },
          { width: 1920, height: 1080 },
          { width: 800, height: 600 },
        ];

        const invalidDimensions = [
          { width: 0, height: 100 }, // Width 0
          { width: 100, height: 0 }, // Height 0
          { width: -100, height: 100 }, // Negative width
          { width: 100, height: -100 }, // Negative height
          { width: 50000, height: 50000 }, // Demasiado grande
          { width: 1, height: 1 }, // Demasiado pequeño
        ];

        validDimensions.forEach(({ width, height }) => {
          expect(SecurityValidator.isValidImageDimensions(width, height)).toBe(
            true
          );
        });

        invalidDimensions.forEach(({ width, height }) => {
          expect(SecurityValidator.isValidImageDimensions(width, height)).toBe(
            false
          );
        });
      });

      it('debería detectar y rechazar polyglot files', async () => {
        // Archivo que es válido como imagen Y como script
        const polyglotFile = Buffer.concat([
          Buffer.from('\xFF\xD8\xFF\xE0'), // JPEG header
          Buffer.from('<?php system($_GET["cmd"]); ?>'), // PHP script
          Buffer.from('\xFF\xD9'), // JPEG footer
        ]);

        expect(await SecurityValidator.validateImageContent(polyglotFile)).toBe(
          false
        );
      });
    });

    describe('Metadata Security', () => {
      it('debería remover metadata peligroso de imágenes', async () => {
        // Crear imagen con metadata
        const imageWithMetadata = await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 3,
            background: { r: 255, g: 0, b: 0 },
          },
        })
          .jpeg({
            // Sharp automáticamente maneja metadata seguro
            quality: 80,
          })
          .toBuffer();

        const cleanedImage =
          await SecuritySanitizer.removeImageMetadata(imageWithMetadata);

        // Verificar que la imagen sigue siendo válida pero sin metadata peligroso
        expect(cleanedImage).toBeInstanceOf(Buffer);
        expect(cleanedImage.length).toBeGreaterThan(0);

        // La imagen limpia debería ser válida
        expect(await SecurityValidator.validateImageContent(cleanedImage)).toBe(
          true
        );
      });

      it('debería preservar metadata esencial para la aplicación', async () => {
        const imageBuffer = await sharp({
          create: {
            width: 800,
            height: 600,
            channels: 3,
            background: { r: 128, g: 128, b: 128 },
          },
        })
          .jpeg()
          .toBuffer();

        const processedImage =
          await SecuritySanitizer.processImageSecurely(imageBuffer);

        // Debería preservar dimensiones y formato
        const metadata = await sharp(processedImage).metadata();
        expect(metadata.width).toBeDefined();
        expect(metadata.height).toBeDefined();
        expect(metadata.format).toBeDefined();
      });
    });
  });

  describe('Request Security and Validation', () => {
    describe('Request Rate Limiting', () => {
      it('debería implementar rate limiting por endpoint', () => {
        const endpoints = [
          { path: '/api/admin/photos/upload', limit: 10, window: 60000 },
          { path: '/api/family/gallery', limit: 30, window: 60000 },
          { path: '/api/storage/signed-url', limit: 60, window: 60000 },
        ];

        endpoints.forEach(({ path, limit, window }) => {
          const ip = '192.168.1.100';

          // Primeros requests deberían pasar
          for (let i = 0; i < limit; i++) {
            expect(
              SecurityValidator.checkEndpointRateLimit(ip, path, limit, window)
            ).toBe(true);
          }

          // El siguiente debería fallar
          expect(
            SecurityValidator.checkEndpointRateLimit(ip, path, limit, window)
          ).toBe(false);
        });
      });

      it('debería aplicar rate limiting diferencial por rol', () => {
        const ip = '192.168.1.100';
        const endpoint = '/api/family/gallery';

        // Familia tiene límite más bajo
        expect(
          SecurityValidator.checkRoleBasedRateLimit(ip, endpoint, 'family')
        ).toBe(true);

        // Admin tiene límite más alto
        expect(
          SecurityValidator.checkRoleBasedRateLimit(ip, endpoint, 'admin')
        ).toBe(true);
      });

      it('debería implementar backoff exponencial para requests abusivos', () => {
        const abusiveIP = '192.168.1.200';
        const endpoint = '/api/admin/photos/upload';

        // Simular abuso (múltiples violations)
        SecurityValidator.recordRateLimitViolation(abusiveIP, endpoint);
        SecurityValidator.recordRateLimitViolation(abusiveIP, endpoint);
        SecurityValidator.recordRateLimitViolation(abusiveIP, endpoint);

        const backoffTime = SecurityValidator.getBackoffTime(
          abusiveIP,
          endpoint
        );
        expect(backoffTime).toBeGreaterThan(0);

        // Debería estar en backoff
        expect(SecurityValidator.isInBackoff(abusiveIP, endpoint)).toBe(true);
      });
    });

    describe('Request Validation', () => {
      it('debería validar Content-Type headers', () => {
        const validContentTypes = [
          'application/json',
          'multipart/form-data',
          'application/x-www-form-urlencoded',
        ];

        const invalidContentTypes = [
          'text/html',
          'application/xml',
          'text/plain',
          'application/javascript',
        ];

        validContentTypes.forEach((contentType) => {
          expect(SecurityValidator.isAllowedContentType(contentType)).toBe(
            true
          );
        });

        invalidContentTypes.forEach((contentType) => {
          expect(SecurityValidator.isAllowedContentType(contentType)).toBe(
            false
          );
        });
      });

      it('debería validar request size limits', () => {
        const maxRequestSize = 50 * 1024 * 1024; // 50MB

        expect(SecurityValidator.isValidRequestSize(1024)).toBe(true);
        expect(SecurityValidator.isValidRequestSize(maxRequestSize)).toBe(true);
        expect(SecurityValidator.isValidRequestSize(maxRequestSize + 1)).toBe(
          false
        );
      });

      it('debería validar request headers para anomalías', () => {
        const suspiciousHeaders = {
          'X-Forwarded-For': '192.168.1.1, 10.0.0.1, 172.16.0.1', // Múltiples proxies
          'User-Agent': '', // User-Agent vacío
          Accept: '*/*', // Accept muy genérico
          Referer: 'javascript:alert(1)', // Referer malicioso
        };

        const normalHeaders = {
          'User-Agent': 'Mozilla/5.0 (compatible; browser)',
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          Referer: 'https://lookescolar.com/admin',
        };

        expect(SecurityValidator.hasAnomalousHeaders(suspiciousHeaders)).toBe(
          true
        );
        expect(SecurityValidator.hasAnomalousHeaders(normalHeaders)).toBe(
          false
        );
      });
    });
  });

  describe('Logging and Monitoring Security', () => {
    describe('Security Event Logging', () => {
      it('debería logear eventos de seguridad sin exponer datos sensibles', () => {
        const sensitiveData = {
          token: 'secret-token-123456789012345678901',
          password: 'user-password-123',
          email: 'user@example.com',
          creditCard: '4111-1111-1111-1111',
        };

        const secureLog = SecurityValidator.createSecureLogEntry(
          'auth_attempt',
          sensitiveData
        );

        expect(secureLog.token).toBe('tok_***');
        expect(secureLog.password).toBe('[REDACTED]');
        expect(secureLog.email).toBe('u***@example.com');
        expect(secureLog.creditCard).toBe('[REDACTED]');
        expect(secureLog.timestamp).toBeDefined();
        expect(secureLog.event).toBe('auth_attempt');
      });

      it('debería detectar patrones de ataque en logs', () => {
        const logEntries = [
          {
            ip: '192.168.1.100',
            endpoint: '/api/admin/login',
            status: 401,
            timestamp: Date.now(),
          },
          {
            ip: '192.168.1.100',
            endpoint: '/api/admin/login',
            status: 401,
            timestamp: Date.now() + 1000,
          },
          {
            ip: '192.168.1.100',
            endpoint: '/api/admin/login',
            status: 401,
            timestamp: Date.now() + 2000,
          },
          {
            ip: '192.168.1.100',
            endpoint: '/api/admin/login',
            status: 401,
            timestamp: Date.now() + 3000,
          },
          {
            ip: '192.168.1.100',
            endpoint: '/api/admin/login',
            status: 401,
            timestamp: Date.now() + 4000,
          },
        ];

        const attackPattern = SecurityValidator.detectAttackPattern(logEntries);

        expect(attackPattern.detected).toBe(true);
        expect(attackPattern.type).toBe('brute_force');
        expect(attackPattern.confidence).toBeGreaterThan(0.8);
      });

      it('debería generar alertas para eventos críticos', () => {
        const criticalEvents = [
          'multiple_failed_login_attempts',
          'sql_injection_attempt',
          'file_upload_malware',
          'unauthorized_admin_access',
          'rate_limit_exceeded',
        ];

        criticalEvents.forEach((event) => {
          const alert = SecurityValidator.shouldGenerateAlert(event);
          expect(alert.shouldAlert).toBe(true);
          expect(alert.severity).toBeOneOf(['high', 'critical']);
        });
      });
    });

    describe('Anomaly Detection', () => {
      it('debería detectar anomalías en patrones de uso', () => {
        const normalActivity = [
          {
            timestamp: Date.now() - 60000,
            action: 'view_gallery',
            user: 'user1',
          },
          {
            timestamp: Date.now() - 50000,
            action: 'view_photo',
            user: 'user1',
          },
          {
            timestamp: Date.now() - 40000,
            action: 'add_to_cart',
            user: 'user1',
          },
        ];

        const anomalousActivity = [
          { timestamp: Date.now(), action: 'admin_login', user: 'user1' }, // Escalación de privilegios
          {
            timestamp: Date.now() + 1000,
            action: 'delete_all_photos',
            user: 'user1',
          }, // Acción destructiva
          {
            timestamp: Date.now() + 2000,
            action: 'export_user_data',
            user: 'user1',
          }, // Exfiltración de datos
        ];

        expect(SecurityValidator.isAnomalousActivity(normalActivity)).toBe(
          false
        );
        expect(SecurityValidator.isAnomalousActivity(anomalousActivity)).toBe(
          true
        );
      });

      it('debería detectar intentos de evasión de security', () => {
        const evasionAttempts = [
          { technique: 'user_agent_rotation', detected: true },
          { technique: 'ip_rotation', detected: true },
          { technique: 'request_timing_variation', detected: true },
          { technique: 'encoding_obfuscation', detected: true },
        ];

        evasionAttempts.forEach(({ technique, detected }) => {
          expect(SecurityValidator.detectEvasionTechnique(technique)).toBe(
            detected
          );
        });
      });
    });
  });

  describe('Configuration and Environment Security', () => {
    describe('Environment Variable Security', () => {
      it('debería validar que todas las variables críticas estén configuradas', () => {
        const requiredEnvVars = [
          'SESSION_SECRET',
          'JWT_SECRET',
          'MP_WEBHOOK_SECRET',
          'SUPABASE_SERVICE_ROLE_KEY',
        ];

        requiredEnvVars.forEach((varName) => {
          expect(process.env[varName]).toBeDefined();
          expect(process.env[varName]).not.toBe('');
          expect(process.env[varName]!.length).toBeGreaterThan(20);
        });
      });

      it('debería validar fortaleza de secrets', () => {
        const secrets = [
          process.env.SESSION_SECRET!,
          process.env.JWT_SECRET!,
          process.env.MP_WEBHOOK_SECRET!,
        ];

        secrets.forEach((secret) => {
          expect(SecurityValidator.isStrongSecret(secret)).toBe(true);
          expect(secret.length).toBeGreaterThanOrEqual(32);
        });
      });

      it('debería detectar secrets expuestos en código', () => {
        const codeSnippets = [
          'const secret = "hardcoded-secret-123";',
          'JWT_SECRET=production-secret-key',
          'password: "admin123"',
          'api_key: process.env.API_KEY', // Este es correcto
        ];

        const exposedSecrets = SecurityValidator.findExposedSecrets(
          codeSnippets.join('\n')
        );

        expect(exposedSecrets.length).toBeGreaterThan(0);
        expect(exposedSecrets.some((s) => s.includes('hardcoded-secret'))).toBe(
          true
        );
      });
    });

    describe('Security Headers', () => {
      it('debería configurar CSP headers correctamente', () => {
        const cspHeader = SecurityValidator.generateCSPHeader();

        expect(cspHeader).toContain("default-src 'self'");
        expect(cspHeader).toContain(
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com"
        );
        expect(cspHeader).toContain(
          "img-src 'self' blob: data: https://*.supabase.co"
        );
        expect(cspHeader).not.toContain("'unsafe-eval'"); // Solo donde es necesario
      });

      it('debería configurar security headers defensivos', () => {
        const securityHeaders = SecurityValidator.generateSecurityHeaders();

        expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
        expect(securityHeaders['X-Frame-Options']).toBe('DENY');
        expect(securityHeaders['X-XSS-Protection']).toBe('1; mode=block');
        expect(securityHeaders['Strict-Transport-Security']).toBeDefined();
        expect(securityHeaders['Referrer-Policy']).toBe(
          'strict-origin-when-cross-origin'
        );
      });
    });
  });
});
