import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();

    console.log('Verificando bucket photos...');

    // Verificar si el bucket existe
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listando buckets:', listError);
      return NextResponse.json(
        {
          error: 'Error listando buckets: ' + listError.message,
          details: listError,
        },
        { status: 500 }
      );
    }

    console.log(
      'Buckets encontrados:',
      buckets?.map((b) => b.name)
    );

    const photosBucket = buckets?.find((b) => b.name === 'photos');

    if (!photosBucket) {
      console.log('Bucket photos no existe, creando...');

      // Crear bucket privado
      const { data: newBucket, error: createError } =
        await supabase.storage.createBucket('photos', {
          public: false,
          allowedMimeTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
          ],
          fileSizeLimit: 10485760, // 10MB
        });

      if (createError) {
        console.error('Error creando bucket:', createError);
        return NextResponse.json(
          {
            error: 'Error creando bucket: ' + createError.message,
            details: createError,
          },
          { status: 500 }
        );
      }

      console.log('Bucket photos creado:', newBucket);
    }

    // Verificar permisos de escritura
    const testFile = `test/${Date.now()}.txt`;
    const testContent = 'Test file for bucket permissions';

    console.log('Probando escritura en bucket...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(testFile, testContent, {
        contentType: 'text/plain',
      });

    if (uploadError) {
      console.error('Error subiendo archivo de prueba:', uploadError);
      return NextResponse.json(
        {
          error: 'Error probando escritura en bucket: ' + uploadError.message,
          bucketExists: !!photosBucket,
          details: uploadError,
        },
        { status: 500 }
      );
    }

    console.log('Archivo de prueba subido:', uploadData);

    // Limpiar archivo de prueba
    await supabase.storage.from('photos').remove([testFile]);

    return NextResponse.json({
      success: true,
      message: 'Bucket photos configurado correctamente',
      bucketExists: true,
      writePermission: true,
      buckets: buckets?.map((b) => ({ name: b.name, public: b.public })),
    });
  } catch (error) {
    console.error('Error en setup-bucket:', error);
    return NextResponse.json(
      {
        error:
          'Error interno: ' +
          (error instanceof Error ? error.message : 'Unknown'),
        details: error,
      },
      { status: 500 }
    );
  }
}
