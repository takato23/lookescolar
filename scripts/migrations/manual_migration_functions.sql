-- FUNCIONES DE PUBLICACIÓN PARA CARPETAS
-- Ejecutá este script en Supabase SQL Editor

BEGIN;

-- 1. Función para generar tokens
CREATE OR REPLACE FUNCTION generate_folder_share_token()
RETURNS text AS $$
BEGIN
    -- Generate 32 character hex token (same format as existing system)
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función principal para publicar carpetas
CREATE OR REPLACE FUNCTION publish_folder(folder_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    new_token text;
    folder_record record;
    result jsonb;
BEGIN
    -- Generate unique token
    LOOP
        new_token := generate_folder_share_token();
        -- Check if token already exists (very unlikely but safe)
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM folders WHERE share_token = new_token
            UNION
            SELECT 1 FROM subjects WHERE token = new_token
            UNION  
            SELECT 1 FROM codes WHERE token = new_token
        );
    END LOOP;
    
    -- Update folder with sharing info
    UPDATE public.folders 
    SET 
        share_token = new_token,
        is_published = true,
        published_at = now(),
        publish_settings = COALESCE(publish_settings, '{}'::jsonb) || jsonb_build_object(
            'published_by', COALESCE(current_setting('request.jwt.claims.sub', true), 'admin'),
            'publish_method', 'folder_share'
        )
    WHERE id = folder_uuid
    RETURNING * INTO folder_record;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folder not found: %', folder_uuid;
    END IF;
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'folder_id', folder_record.id,
        'share_token', folder_record.share_token,
        'url', '/f/' || folder_record.share_token,
        'qr_url', '/api/qr?token=' || folder_record.share_token,
        'published_at', folder_record.published_at
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para despublicar carpetas
CREATE OR REPLACE FUNCTION unpublish_folder(folder_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    folder_record record;
BEGIN
    UPDATE public.folders 
    SET 
        share_token = NULL,
        is_published = false,
        published_at = NULL,
        publish_settings = COALESCE(publish_settings, '{}'::jsonb) || jsonb_build_object(
            'unpublished_at', now(),
            'unpublished_by', COALESCE(current_setting('request.jwt.claims.sub', true), 'admin')
        )
    WHERE id = folder_uuid
    RETURNING * INTO folder_record;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folder not found: %', folder_uuid;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'folder_id', folder_record.id,
        'unpublished_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para publicar múltiples carpetas (bulk)
CREATE OR REPLACE FUNCTION bulk_publish_folders(folder_ids uuid[])
RETURNS jsonb AS $$
DECLARE
    folder_id uuid;
    result jsonb;
    success_count integer := 0;
    error_count integer := 0;
    results jsonb[] := '{}';
    folder_result jsonb;
BEGIN
    -- Process each folder
    FOREACH folder_id IN ARRAY folder_ids
    LOOP
        BEGIN
            -- Call publish_folder for each ID
            SELECT publish_folder(folder_id) INTO folder_result;
            results := array_append(results, folder_result);
            success_count := success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Handle individual folder errors
            folder_result := jsonb_build_object(
                'success', false,
                'folder_id', folder_id,
                'error', SQLERRM
            );
            results := array_append(results, folder_result);
            error_count := error_count + 1;
        END;
    END LOOP;
    
    -- Return summary
    result := jsonb_build_object(
        'success', error_count = 0,
        'total_folders', array_length(folder_ids, 1),
        'success_count', success_count,
        'error_count', error_count,
        'results', array_to_json(results)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Dar permisos a las funciones
GRANT EXECUTE ON FUNCTION generate_folder_share_token() TO service_role;
GRANT EXECUTE ON FUNCTION publish_folder(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION unpublish_folder(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION bulk_publish_folders(uuid[]) TO service_role;

-- También dar permisos a authenticated si es necesario
GRANT EXECUTE ON FUNCTION generate_folder_share_token() TO authenticated;
GRANT EXECUTE ON FUNCTION publish_folder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION unpublish_folder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_publish_folders(uuid[]) TO authenticated;

COMMIT;

-- Verificación
SELECT 'Funciones de publicación creadas exitosamente' as status;