import {
  sanitizeHtml,
  sanitizeProductDescription,
  sanitizeUrl,
  sanitizeText,
  sanitizeFormInput
} from '@/lib/utils/sanitization';

describe('Sanitización XSS', () => {
  describe('sanitizeHtml', () => {
    it('debe remover tags HTML peligrosos', () => {
      const dangerousHtml = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(dangerousHtml);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe content');
    });

    it('debe remover atributos peligrosos', () => {
      const dangerousHtml = '<div onclick="alert(\'xss\')">Content</div>';
      const result = sanitizeHtml(dangerousHtml);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Content');
    });

    it('debe mantener contenido seguro', () => {
      const safeHtml = '<p>Safe paragraph</p><strong>Bold text</strong>';
      const result = sanitizeHtml(safeHtml);

      expect(result).toContain('Safe paragraph');
      expect(result).toContain('Bold text');
    });
  });

  describe('sanitizeProductDescription', () => {
    it('debe remover scripts de descripciones', () => {
      const description = 'Producto genial <script>alert("xss")</script> muy útil';
      const result = sanitizeProductDescription(description);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Producto genial');
      expect(result).toContain('muy útil');
    });

    it('debe remover iframes', () => {
      const description = 'Ver video: <iframe src="evil.com"></iframe>';
      const result = sanitizeProductDescription(description);

      expect(result).not.toContain('<iframe>');
      expect(result).toContain('Ver video:');
    });

    it('debe remover event handlers', () => {
      const description = '<div onclick="alert()">Click me</div>';
      const result = sanitizeProductDescription(description);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });
  });

  describe('sanitizeUrl', () => {
    it('debe rechazar URLs no HTTP/HTTPS', () => {
      const result = sanitizeUrl('javascript:alert("xss")');
      expect(result).toBeNull();
    });

    it('debe rechazar dominios no permitidos', () => {
      const result = sanitizeUrl('https://evil.com/path');
      expect(result).toBeNull();
    });

    it('debe aceptar dominios permitidos', () => {
      const result = sanitizeUrl('https://lookescolar.com/path');
      expect(result).toBe('https://lookescolar.com/path');
    });

    it('debe aceptar localhost para desarrollo', () => {
      const result = sanitizeUrl('http://localhost:3000/path');
      expect(result).toBe('http://localhost:3000/path');
    });
  });

  describe('sanitizeText', () => {
    it('debe remover caracteres HTML', () => {
      const result = sanitizeText('<div>Content & more</div>');
      expect(result).toBe('Content & more');
    });

    it('debe remover protocolos javascript', () => {
      const result = sanitizeText('javascript:alert("xss")');
      expect(result).toBe('alert("xss")');
    });

    it('debe remover event handlers', () => {
      const result = sanitizeText('onclick="alert()"');
      expect(result).toBe('');
    });

    it('debe preservar texto normal', () => {
      const result = sanitizeText('Texto normal con números 123');
      expect(result).toBe('Texto normal con números 123');
    });
  });

  describe('sanitizeFormInput', () => {
    it('debe validar emails correctamente', () => {
      expect(() => sanitizeFormInput('user@example.com', 'email')).not.toThrow();
      expect(sanitizeFormInput('user@example.com', 'email')).toBe('user@example.com');
    });

    it('debe rechazar emails inválidos', () => {
      expect(() => sanitizeFormInput('invalid-email', 'email')).toThrow('Formato de email inválido');
    });

    it('debe validar números correctamente', () => {
      expect(sanitizeFormInput('123.45', 'number')).toBe('123.45');
      expect(sanitizeFormInput('0', 'number')).toBe('0');
    });

    it('debe rechazar valores no numéricos', () => {
      expect(() => sanitizeFormInput('no-un-numero', 'number')).toThrow('Debe ser un número válido');
    });

    it('debe validar URLs correctamente', () => {
      expect(() => sanitizeFormInput('https://lookescolar.com', 'url')).not.toThrow();
      expect(sanitizeFormInput('https://lookescolar.com', 'url')).toBe('https://lookescolar.com');
    });

    it('debe rechazar URLs inválidas', () => {
      expect(() => sanitizeFormInput('javascript:alert()', 'url')).toThrow('URL inválida');
    });

    it('debe sanitizar texto por defecto', () => {
      const result = sanitizeFormInput('<script>alert()</script>Texto seguro', 'text');
      expect(result).toBe('Texto seguro');
    });
  });
});
