#!/bin/bash

echo "🔧 Agregando variables de entorno faltantes a Vercel..."

# Supabase ANON KEY
echo "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjc5OTEsImV4cCI6MjA2OTk0Mzk5MX0.d8aNl4kE5XKTKKnK1M1R4PoLWwjrKiL4ZXH7Eo8dgLw" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Supabase SERVICE ROLE KEY
echo "Adding SUPABASE_SERVICE_ROLE_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Temporary bypass for debugging
echo "Adding temporary bypass variables..."
echo "true" | vercel env add ENABLE_PROD_BYPASS production
echo "temp_debug_token_remove_me" | vercel env add PROD_BYPASS_TOKEN production

echo "✅ Variables críticas agregadas!"
echo "🚀 Ejecuta: vercel --prod para desplegar"