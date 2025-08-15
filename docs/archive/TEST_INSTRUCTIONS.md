# 🧪 INSTRUCCIONES DE PRUEBA - Sistema de Fotografía Escolar

## 1️⃣ FLUJO ADMIN (Melisa)

### Acceder al panel admin:
```
http://localhost:3000/admin
```

### Crear un evento:
1. Ir a "Eventos" o directamente a: `http://localhost:3000/admin/events`
2. Click en "Nuevo Evento"
3. Llenar los datos del evento
4. Guardar

### Crear alumnos/sujetos:
1. Entrar al evento creado
2. En la sección "Alumnos", agregar alumnos uno por uno o:
3. Usar "Importar CSV" para agregar múltiples alumnos
4. Se generará un TOKEN único para cada alumno (≥20 caracteres)

### Subir fotos:
1. Ir a "Fotos" o directamente a: `http://localhost:3000/admin/photos`
2. Seleccionar el evento del dropdown (si hay múltiples)
3. Click en "Subir Fotos"
4. Seleccionar múltiples imágenes
5. Las fotos se procesarán con watermark automáticamente

### Clasificar/Etiquetar fotos:
1. Desde la galería de fotos, seleccionar las fotos a etiquetar
2. Click en "Etiquetar"
3. O ir directamente a: `http://localhost:3000/admin/tagging`
4. Escanear QR del alumno o seleccionarlo de la lista
5. Asignar las fotos seleccionadas

## 2️⃣ FLUJO FAMILIA

### Acceso con token:
Las familias acceden con su token único (el que está en el QR):
```
http://localhost:3000/f/[TOKEN]
```
Ejemplo:
```
http://localhost:3000/f/tk_AbCdEfGhIjKlMnOpQrStUv
```

### En la galería familiar:
1. **Ver fotos**: Solo verán las fotos asignadas a su hijo/a
2. **Favoritos**: Pueden marcar favoritas con el corazón
3. **Seleccionar**: Click en "Seleccionar" para agregar al carrito
4. **Ampliar**: Click en la foto para ver en tamaño grande
5. **Carrito**: Ver el carrito con las fotos seleccionadas
6. **Comprar**: Completar datos y proceder al pago

## 3️⃣ DATOS DE PRUEBA

### Para crear un evento rápido:
- Nombre: "Graduación 2024"
- Colegio: "Colegio San José"
- Ubicación: "Salón Principal"
- Fecha: Hoy

### Para crear alumnos de prueba:
```csv
nombre,grado
Juan Pérez,5A
María García,5A
Carlos López,5B
```

### Tokens de ejemplo generados:
Después de crear los alumnos, cada uno tendrá un token como:
- Juan: `tk_x9K2mNpQ5vR8tY3wA6bC`
- María: `tk_h7J4nLqS6uT9xZ2yB5dE`
- Carlos: `tk_m3P6rVsU8wX1aD4fG7hJ`

## 4️⃣ VERIFICACIÓN DE FUNCIONALIDADES

### ✅ Upload de fotos:
1. Las fotos deben mostrar "MUESTRA" como watermark
2. Deben aparecer en la galería inmediatamente
3. El progress bar debe funcionar durante el upload

### ✅ Tagging/Clasificación:
1. El scanner QR debe abrir la cámara (si hay permisos)
2. Debe poder seleccionar múltiples fotos
3. Las asignaciones deben guardarse correctamente

### ✅ Portal familiar:
1. Solo deben ver fotos asignadas a su hijo
2. El sistema de favoritos debe persistir
3. El carrito debe mantener las selecciones
4. Las URLs de las fotos deben expirar en 1 hora

## 5️⃣ URLS IMPORTANTES

### Admin:
- Panel principal: `http://localhost:3000/admin`
- Eventos: `http://localhost:3000/admin/events`
- Fotos: `http://localhost:3000/admin/photos`
- Tagging: `http://localhost:3000/admin/tagging`

### Familias:
- Portal: `http://localhost:3000/f/[TOKEN]`
- Ejemplo: `http://localhost:3000/f/tk_x9K2mNpQ5vR8tY3wA6bC`

## 6️⃣ SOLUCIÓN DE PROBLEMAS

### Si no se suben las fotos:
1. Verificar que hay un evento seleccionado
2. Verificar que las imágenes son JPG/PNG
3. Verificar la consola del navegador para errores

### Si no se ven las fotos en familia:
1. Verificar que el token es correcto (≥20 caracteres)
2. Verificar que las fotos están asignadas al alumno
3. Verificar que el evento está activo

### Si el QR scanner no funciona:
1. Dar permisos de cámara al navegador
2. Usar el fallback manual ingresando el token
3. Verificar que el QR contiene un token válido

## 7️⃣ COMANDOS ÚTILES

```bash
# Ver logs del servidor
npm run dev

# Verificar base de datos
npm run db:studio

# Limpiar cache
rm -rf .next

# Reiniciar todo
npm run dev
```

---

**NOTA**: El sistema está configurado para funcionar con Supabase Cloud. Asegúrate de que las variables de entorno en `.env.local` apuntan a tu proyecto de Supabase.