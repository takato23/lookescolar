#!/bin/bash

# Script para configurar la base de datos en Supabase Cloud
# Asegúrate de tener las credenciales correctas en .env.local

echo "=========================================="
echo "Setup de Base de Datos - LookEscolar"
echo "=========================================="

# Cargar variables de entorno
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ Error: No se encontró .env.local"
    echo "Por favor crea el archivo .env.local con las credenciales de Supabase"
    exit 1
fi

# Verificar que tenemos las credenciales necesarias
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Faltan credenciales de Supabase en .env.local"
    exit 1
fi

# Extraer el project ID de la URL
PROJECT_ID=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')
echo "📦 Project ID: $PROJECT_ID"

# Función para ejecutar SQL via API de Supabase
execute_sql() {
    local sql_file=$1
    local sql_content=$(cat $sql_file)
    
    # Escapar el contenido SQL para JSON
    sql_content=$(echo "$sql_content" | jq -Rs .)
    
    curl -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $sql_content}" \
        --silent --show-error
}

echo ""
echo "⚠️  ADVERTENCIA: Este script va a:"
echo "  1. ELIMINAR todas las tablas existentes"
echo "  2. Crear el esquema completo desde cero"
echo "  3. Configurar RLS policies"
echo ""
read -p "¿Estás seguro que quieres continuar? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo "🔄 Ejecutando migración..."

# Usar psql para ejecutar el SQL directamente
# Necesitas la contraseña del proyecto que está en Supabase Dashboard
echo "📝 Necesitas la contraseña de la base de datos de Supabase"
echo "   Puedes encontrarla en: Dashboard -> Settings -> Database"
echo ""

# Construir la URL de conexión
DB_HOST="db.${PROJECT_ID}.supabase.co"
DB_USER="postgres.${PROJECT_ID}"
DB_NAME="postgres"

echo "🔗 Conectando a: $DB_HOST"
echo ""

# Ejecutar el SQL
psql "postgresql://${DB_USER}@${DB_HOST}:5432/${DB_NAME}" \
    -f supabase/migrations/001_create_all_tables.sql \
    -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Base de datos configurada exitosamente!"
    echo ""
    echo "📊 Tablas creadas:"
    echo "  • admin_users - Usuarios administradores"
    echo "  • events - Eventos/sesiones fotográficas"
    echo "  • subjects - Alumnos/familias con tokens"
    echo "  • photos - Fotos con watermark"
    echo "  • orders - Pedidos de compra"
    echo "  • order_items - Items de cada pedido"
    echo "  • egress_metrics - Métricas de transferencia"
    echo ""
    echo "🔒 RLS habilitado en todas las tablas"
    echo "🔑 Service role tiene acceso completo"
    echo ""
    echo "Próximos pasos:"
    echo "  1. Verificar las tablas en Supabase Dashboard"
    echo "  2. Configurar el Storage bucket (photos-bucket)"
    echo "  3. Probar la aplicación con npm run dev"
else
    echo ""
    echo "❌ Error al ejecutar la migración"
    echo "   Verifica las credenciales y la conexión"
fi