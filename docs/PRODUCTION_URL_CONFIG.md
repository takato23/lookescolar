# Configuración de URLs para Producción

## Problema Resuelto
Se detectó que los enlaces compartidos estaban generándose con `localhost:3001` en lugar del dominio de producción. Este problema ha sido solucionado.

## Solución Implementada

### 1. Utility de URLs Centralizado
Se creó `/lib/utils/url.ts` que maneja la generación de URLs de forma consistente:
- Detecta automáticamente el entorno (desarrollo, preview, producción)
- Preserva el protocolo correcto (HTTP/HTTPS)
- Usa variables de entorno apropiadas

### 2. APIs Actualizadas
Las siguientes APIs han sido actualizadas para usar el nuevo sistema:
- `/api/admin/share/route.ts` - Creación de enlaces compartidos
- `/api/admin/folders/[id]/publish/route.ts` - Publicación de carpetas
- `/api/admin/share/create/route.ts` - Creación de enlaces

### 3. Variables de Entorno Requeridas

#### En Vercel (Producción)
Configura estas variables en el dashboard de Vercel:

```bash
# URL de producción (CRÍTICO)
NEXT_PUBLIC_SITE_URL=https://lookescolar.com

# O si usas un subdominio
NEXT_PUBLIC_SITE_URL=https://app.lookescolar.com
```

#### En Preview (Automático)
Vercel automáticamente provee `VERCEL_URL` que será usado para deployments de preview.

#### En Desarrollo Local
Ya configurado en `.env.local`:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Orden de Prioridad para URLs

El sistema usa este orden de prioridad:
1. **NEXT_PUBLIC_SITE_URL** - Si está configurado (producción)
2. **VERCEL_URL** - Para deployments de Vercel (preview/branch)
3. **Request origin** - Preserva el protocolo y host de la request
4. **Fallback** - http://localhost:3000 (desarrollo)

## Verificación en Producción

### Pasos para verificar:
1. Ir a `/admin/photos`
2. Seleccionar fotos
3. Click en "Crear enlace"
4. Verificar que el enlace generado use el dominio correcto

### URLs que deben funcionar:
- Enlaces de tienda: `https://[tu-dominio]/store-unified/[token]`
- Enlaces familiares: `https://[tu-dominio]/f/[token]`
- Enlaces compartidos: `https://[tu-dominio]/s/[token]`

## Troubleshooting

### Si los enlaces siguen mostrando localhost:
1. Verifica que `NEXT_PUBLIC_SITE_URL` esté configurado en Vercel
2. Redespliega la aplicación después de configurar la variable
3. Limpia el caché del navegador

### Si los enlaces no funcionan:
1. Verifica que el dominio esté correctamente configurado en Vercel
2. Asegúrate de que los certificados SSL estén activos
3. Revisa los logs de Vercel para errores

## Notas Importantes

- **NO** hardcodees URLs en el código
- **SIEMPRE** usa las utilidades de `/lib/utils/url.ts`
- **VERIFICA** las URLs en cada deployment nuevo
- **CONFIGURA** `NEXT_PUBLIC_SITE_URL` en producción antes del lanzamiento