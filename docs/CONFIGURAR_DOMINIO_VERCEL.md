# Cómo configurar lookescolar.com.ar en Vercel

## Pasos para conectar tu dominio

### 1. En Vercel:
1. Ve a tu proyecto en Vercel Dashboard
2. Click en "Settings" → "Domains"
3. Agrega `lookescolar.com.ar` y `www.lookescolar.com.ar`
4. Vercel te dará instrucciones de DNS

### 2. En tu proveedor de dominio (donde compraste lookescolar.com.ar):

#### Opción A: Usando registros A (más control)
Agrega estos registros DNS:
```
Tipo: A
Host: @
Valor: 76.76.21.21
```

Y para www:
```
Tipo: CNAME
Host: www
Valor: cname.vercel-dns.com
```

#### Opción B: Usando Nameservers de Vercel (más simple)
Cambia los nameservers a:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### 3. Esperar propagación DNS
- Puede tomar de 5 minutos a 48 horas
- Generalmente funciona en 30 minutos

### 4. Una vez configurado el dominio:

En Vercel, actualiza la variable de entorno:
```bash
NEXT_PUBLIC_SITE_URL=https://lookescolar.com.ar
```

## Verificación

### Para verificar que el DNS está propagado:
```bash
# En terminal:
nslookup lookescolar.com.ar
dig lookescolar.com.ar
```

### En el navegador:
1. Visita https://lookescolar.com.ar
2. Debería cargar tu aplicación

## Proveedores comunes en Argentina

### Si tu dominio está en NIC.ar:
1. Ingresa a https://nic.ar
2. Gestión de dominios
3. Modifica los DNS

### Si está en DonWeb:
1. Panel de control → Dominios
2. Administrar DNS
3. Agregar los registros A y CNAME

### Si está en Wiroos/Neolo:
1. Mi cuenta → Dominios
2. Administrar → Zone Editor
3. Agregar registros

## SSL/HTTPS
Vercel automáticamente provee certificados SSL gratuitos una vez que el dominio está verificado.

## Solución temporal mientras configuras el dominio

Por ahora, puedes:

1. **Usar el dominio de Vercel** en la variable de entorno:
```bash
NEXT_PUBLIC_SITE_URL=https://lookescolar-git-production-january-2025-baloskys-projects.vercel.app
```

2. **O dejar que el sistema lo detecte automáticamente** (no configures NEXT_PUBLIC_SITE_URL)
   - El sistema usará automáticamente `VERCEL_URL` que Vercel provee

## Problemas comunes

### "Invalid Configuration" en Vercel
- Verifica que los registros DNS estén correctos
- Espera más tiempo para la propagación

### El dominio no carga
- Verifica con `nslookup` que los DNS apunten a Vercel
- Asegúrate de que no haya conflictos con otros servicios

### Enlaces siguen mostrando dominio incorrecto
- Limpia caché del navegador
- Redespliega en Vercel después de cambiar variables de entorno

## Contacto con el proveedor

Si necesitas ayuda, contacta a tu proveedor de dominio y diles:
"Necesito apuntar mi dominio a Vercel con estos registros DNS:
- Un registro A apuntando a 76.76.21.21
- Un registro CNAME de www apuntando a cname.vercel-dns.com"