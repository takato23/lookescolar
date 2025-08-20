#!/bin/bash

echo "🔧 Configurando variables de entorno en Vercel..."

# Supabase Configuration
echo "Setting NEXT_PUBLIC_SUPABASE_URL..."
echo "https://exaighpowgvbdappydyx.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo "Setting NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjc5OTEsImV4cCI6MjA2OTk0Mzk5MX0.d8aNl4kE5XKTKKnK1M1R4PoLWwjrKiL4ZXH7Eo8dgLw" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YWlnaHBvd2d2YmRhcHB5ZHl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2Nzk5MSwiZXhwIjoyMDY5OTQzOTkxfQ.gpH0Jd2fQliSMknPicdXEx9Em54o4WxKfZoK9rzK61E" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Storage Configuration
echo "Setting storage configuration..."
echo "photo-private" | vercel env add STORAGE_BUCKET_ORIGINAL production
echo "photos" | vercel env add STORAGE_BUCKET_PREVIEW production
echo "photo-private" | vercel env add STORAGE_BUCKET production

# Admin Configuration
echo "Setting admin configuration..."
echo "admin@lookescolar.dev,demo@lookescolar.dev" | vercel env add ADMIN_EMAILS production

# App URL
echo "Setting app URL..."
echo "https://lookescolar.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

echo "✅ Variables de entorno configuradas!"
echo "🚀 Ahora ejecuta: vercel --prod"