# Product Requirements Document (PRD)
## Sistema de Fotografía Escolar - LookEscolar

**Versión**: 1.0.0  
**Fecha**: Enero 2025  
**Cliente**: Melisa (Fotógrafa Escolar)  
**Autor**: Santiago Balosky

---

## 1. RESUMEN EJECUTIVO

### 1.1 Visión del Producto
Sistema web que digitaliza y optimiza el proceso de venta de fotografías escolares, permitiendo a la fotógrafa gestionar eventos, subir fotos con watermark, y a las familias ver y comprar solo sus fotos mediante acceso con token único.

### 1.2 Problema a Resolver
- **Proceso manual ineficiente**: Entrega física de fotos para selección
- **Gestión compleja de pedidos**: Sin trazabilidad digital
- **Pagos manuales**: Sin integración con medios de pago digitales
- **Distribución costosa**: Múltiples visitas al colegio

### 1.3 Solución Propuesta
Plataforma web con:
- Panel administrativo para la fotógrafa
- Portal de familias con acceso por QR/token
- Procesamiento automático con watermark
- Integración con Mercado Pago
- Sistema de pedidos digitalizado

---

## 2. OBJETIVOS Y MÉTRICAS

### 2.1 Objetivos de Negocio
| Objetivo | Métrica | Target MVP | Target 6 meses |
|----------|---------|------------|----------------|
| Digitalizar ventas | % pedidos digitales | 50% | 80% |
| Reducir tiempo gestión | Horas por evento | -30% | -50% |
| Aumentar conversión | Tasa compra/visita | 25% | 35% |
| Reducir costos | Visitas al colegio | 2 | 1 |

### 2.2 Objetivos Técnicos
- Response time <200ms para APIs
- Disponibilidad >99.5%
- Procesamiento foto <3s
- Zero fotos originales en la nube
- 100% URLs firmadas temporales

---

## 3. USUARIOS Y PERSONAS

### 3.1 Persona Primaria: Melisa (Fotógrafa)
**Demografía**: 35 años, fotógrafa profesional, 5 años experiencia escolar  
**Tech Skills**: Medio - usa WhatsApp Business, Instagram, edición básica  
**Necesidades**:
- Subir fotos rápidamente en lotes
- Organizar por alumno eficientemente  
- Ver pedidos claramente
- Exportar para impresión

**Pain Points**:
- Proceso manual toma mucho tiempo
- Difícil trackear qué familia pidió qué
- Cobros en efectivo complicados

### 3.2 Persona Secundaria: Familia (Padres)
**Demografía**: 30-45 años, padres trabajadores, 1-3 hijos  
**Tech Skills**: Básico/Medio - usan apps bancarias, redes sociales  
**Necesidades**:
- Ver fotos de su hijo fácilmente
- Comprar desde casa
- Pagar con tarjeta/MP
- Recibir fotos impresas

**Pain Points**:
- Poco tiempo para ir al colegio
- Proceso de selección apurado
- Solo efectivo como opción

---

## 4. FUNCIONALIDADES (MVP)

### 4.1 Panel Admin (Melisa)

#### 4.1.1 Gestión de Eventos
**Como** fotógrafa  
**Quiero** crear y gestionar eventos fotográficos  
**Para** organizar las sesiones por colegio y fecha

**Criterios de Aceptación**:
- CRUD completo de eventos
- Campos: nombre, colegio, fecha
- Estado activo/inactivo
- Listado con filtros

#### 4.1.2 Gestión de Sujetos
**Como** fotógrafa  
**Quiero** crear lista de alumnos con tokens únicos  
**Para** que cada familia acceda solo a sus fotos

**Criterios**:
- Tipos: student, couple, family
- Token único ≥20 chars
- Generación masiva
- PDF con QRs para imprimir

#### 4.1.3 Upload y Procesamiento
**Como** fotógrafa  
**Quiero** subir fotos que se procesen automáticamente  
**Para** aplicar watermark sin trabajo manual

**Criterios**:
- Upload batch hasta 50 fotos
- Watermark automático server-side
- Resize a 1600px máximo
- Formato WebP calidad 72
- Progress bar en tiempo real
- Límite 5GB por evento

#### 4.1.4 Sistema de Tagging
**Como** fotógrafa  
**Quiero** asignar fotos a alumnos escaneando QR  
**Para** organizar rápidamente las galerías

**Criterios**:
- Scanner con cámara (BarcodeDetector API)
- Fallback input manual
- Filtros: sin asignar, por sujeto
- Asignación 1:1 foto-sujeto
- Bulk operations

#### 4.1.5 Gestión de Precios
**Como** fotógrafa  
**Quiero** configurar precios por evento  
**Para** manejar diferentes tarifas

**Criterios**:
- Lista de precios por evento
- Formatos: 10x15, 13x18, 20x30, Digital
- Precios en pesos argentinos
- CRUD de items

#### 4.1.6 Gestión de Pedidos
**Como** fotógrafa  
**Quiero** ver y gestionar pedidos  
**Para** saber qué imprimir y entregar

**Criterios**:
- Listado con filtros (estado, fecha, evento)
- Detalle de fotos y cantidades
- Export a CSV
- Marcar como entregado
- Estados: pending, approved, delivered, failed

### 4.2 Portal Familia

#### 4.2.1 Acceso por Token
**Como** familia  
**Quiero** acceder con mi QR/token  
**Para** ver las fotos de mi hijo

**Criterios**:
- Ruta `/f/[token]`
- Sin registro requerido
- Validación de token
- Mensaje si token expirado
- Sin acceso a otras galerías

#### 4.2.2 Galería Personal
**Como** familia  
**Quiero** ver todas las fotos de mi hijo  
**Para** elegir cuáles comprar

**Criterios**:
- Solo fotos asignadas al sujeto
- URLs firmadas temporales (1h)
- Virtual scroll si >50 fotos
- Zoom en fotos
- Loading optimizado

#### 4.2.3 Carrito de Compras
**Como** familia  
**Quiero** seleccionar fotos y cantidades  
**Para** hacer mi pedido

**Criterios**:
- Agregar/quitar fotos
- Seleccionar formato por foto
- Ver precio total
- Persistencia en sessionStorage
- Máximo 1 pedido pending activo

#### 4.2.4 Checkout y Pago
**Como** familia  
**Quiero** pagar con Mercado Pago  
**Para** confirmar mi compra

**Criterios**:
- Formulario: nombre, email, teléfono
- Integración MP Checkout Pro
- Redirect a MP para pago
- Estados: success, pending, failure
- Confirmación por webhook

---

## 5. REQUERIMIENTOS NO FUNCIONALES

### 5.1 Seguridad
- ✅ Bucket storage PRIVADO
- ✅ URLs firmadas con expiración 1h
- ✅ Tokens ≥20 chars con crypto.randomBytes
- ✅ RLS en TODAS las tablas
- ✅ Rate limiting por IP y token
- ✅ CSP headers configurados
- ✅ HMAC verification en webhooks
- ✅ No logging de tokens/URLs sensibles

### 5.2 Performance
- Response time <200ms
- Procesamiento foto <3s
- Concurrencia 3-5 fotos simultáneas
- Bundle size <500KB inicial
- Virtual scroll para >50 items
- Cache URLs firmadas 1h

### 5.3 Escalabilidad
- Soportar 100 eventos simultáneos
- 10,000 fotos por evento
- 1,000 familias concurrentes
- 5GB storage por evento
- Auto-cleanup >90 días

### 5.4 Usabilidad
- Mobile-first responsive
- Accesibilidad WCAG 2.1 AA
- Loading states claros
- Mensajes de error útiles
- Tiempo primera interacción <3s

### 5.5 Confiabilidad
- Uptime 99.5%
- Backup diario DB
- Webhook idempotente
- Transacciones atómicas
- Rollback capability

---

## 6. RESTRICCIONES Y LIMITACIONES

### 6.1 Técnicas
- NO subir fotos originales (quedan offline)
- Solo preview con watermark
- Límite 10MB por foto
- Máximo 50 fotos por batch
- Storage 5GB soft limit por evento

### 6.2 Negocio
- MVP sin notificaciones email
- Sin descarga digital directa
- Solo Mercado Pago (no efectivo online)
- Un fotógrafo (no multi-tenant)
- Argentina only (ARS, español)

### 6.3 Legales
- GDPR compliance para datos
- No almacenar datos de tarjetas
- Consentimiento para fotos menores
- Términos y condiciones requeridos

---

## 7. ARQUITECTURA TÉCNICA

### 7.1 Stack Tecnológico
```
Frontend:
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (estado)

Backend:
- Next.js API Routes
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage

Procesamiento:
- Sharp (watermarks)
- p-limit (queue)
- nanoid (tokens)

Pagos:
- Mercado Pago SDK
- Webhook handlers

Testing:
- Vitest
- Testing Library
- Playwright (E2E)

DevOps:
- Vercel (hosting)
- GitHub Actions (CI/CD)
- Docker (local dev)
```

### 7.2 Diagrama de Arquitectura
```
┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Vercel    │
└─────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Next.js 14  │
                    │  App Router  │
                    └──────┬──────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Supabase │ │ Supabase │ │   MP     │
        │    DB    │ │ Storage  │ │   API    │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 8. PLAN DE DESARROLLO

### 8.1 Fases y Timeline

| Fase | Descripción | Duración | Entregables |
|------|-------------|----------|-------------|
| 1 | Setup base | 2 días | Proyecto configurado, DB, Auth |
| 2 | Eventos y Sujetos | 2 días | CRUD, tokens, QRs |
| 3 | Pipeline Fotos | 3 días | Upload, watermark, storage |
| 4 | Sistema Tagging | 2 días | Scanner, asignación |
| 5 | Portal Familia | 3 días | Galería, carrito |
| 6 | Integración MP | 2 días | Checkout, webhook |
| 7 | Gestión Pedidos | 2 días | Dashboard, export |
| **Total** | **MVP** | **16 días** | **Sistema completo** |

### 8.2 Definition of Done
- [ ] Código reviewed y aprobado
- [ ] Tests escritos y pasando (>70% coverage)
- [ ] Documentación actualizada
- [ ] Sin errores de TypeScript/Lint
- [ ] Desplegado en ambiente de staging
- [ ] QA manual completado
- [ ] Métricas de performance OK

### 8.3 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Límites API Mercado Pago | Medio | Alto | Implementar retry y queue |
| Procesamiento lento fotos | Medio | Medio | Optimizar workers, CDN |
| Storage excedido | Bajo | Alto | Alertas, cleanup automático |
| Token comprometido | Bajo | Alto | Rotación manual, logs |
| Browser no soporta scanner | Medio | Bajo | Fallback input manual |

---

## 9. CRITERIOS DE ÉXITO

### 9.1 MVP (Mes 1)
- ✅ Sistema funcionando end-to-end
- ✅ 10 eventos procesados exitosamente
- ✅ 100 pedidos completados
- ✅ 0 fotos originales expuestas
- ✅ <5% tasa de error

### 9.2 Post-MVP (Mes 3)
- 📈 50% eventos usando el sistema
- 📈 500+ pedidos mensuales
- 📈 <2% abandoned carts
- 📈 NPS >8 de familias
- 📈 -40% tiempo gestión por evento

---

## 10. APÉNDICES

### 10.1 Mockups y Wireframes
- Ver carpeta `/design` del proyecto

### 10.2 Casos de Uso Detallados
- Ver carpeta `/docs/use-cases`

### 10.3 Glosario
- **Sujeto**: Alumno, pareja o familia fotografiada
- **Token**: Código único de acceso para familia
- **Evento**: Sesión fotográfica en un colegio
- **Tagging**: Asignación de fotos a sujetos
- **Watermark**: Marca de agua en preview

### 10.4 Referencias
- [Mercado Pago Docs](https://www.mercadopago.com.ar/developers)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js 14 Docs](https://nextjs.org/docs)

---

**Aprobaciones**:
- [ ] Product Owner
- [ ] Tech Lead  
- [ ] Cliente (Melisa)
- [ ] QA Lead