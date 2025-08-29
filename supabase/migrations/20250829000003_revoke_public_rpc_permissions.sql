/**
 * MIGRATION: Revoke Public RPC Permissions
 * 
 * Revoca permisos de ejecución de funciones RPC públicas para anon/authenticated
 * Solo service_role puede ejecutar estas funciones para seguridad server-side
 * 
 * Fecha: 2025-08-29
 * Descripción: Asegura que las funciones hierarchical token solo sean accesibles server-side
 */

-- Revocar todos los permisos de las funciones públicas wrapper
REVOKE ALL ON FUNCTION public.folders_for_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assets_for_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_token_context(text) FROM PUBLIC, anon, authenticated;

-- Otorgar permisos solo a service_role (server-side)
GRANT EXECUTE ON FUNCTION public.folders_for_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.assets_for_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_token_context(text) TO service_role;

-- Comentar las funciones para documentar el cambio
COMMENT ON FUNCTION public.folders_for_token(text) IS 'Server-side only: Returns folders accessible by token';
COMMENT ON FUNCTION public.assets_for_token(text) IS 'Server-side only: Returns assets accessible by token with pagination';
COMMENT ON FUNCTION public.get_token_context(text) IS 'Server-side only: Validates token and returns context information';

-- Log de la migración
DO $$
BEGIN
    RAISE NOTICE 'RPC permissions revoked successfully for hierarchical token functions';
    RAISE NOTICE 'Functions are now accessible only to service_role (server-side)';
END $$;