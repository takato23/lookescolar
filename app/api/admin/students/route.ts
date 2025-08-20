import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// GET /api/admin/students
// Optional query params:
// - eventId or event_id: filter students by event
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId') || searchParams.get('event_id') || undefined;

    const supabase = await createServerSupabaseServiceClient();

    // Build base query
    let query = supabase
      .from('subjects')
      .select(
        `
        id,
        name,
        event_id
      `
      )
      .order('name', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Error fetching students', details: error.message },
        { status: 500 }
      );
    }

    const students = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name || 'Sin nombre',
      event_id: s.event_id ?? null,
    }));

    return NextResponse.json({ students });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
});

// POST /api/admin/students/import
// Import students from CSV/Excel file
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const eventId = formData.get('event_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo requerido' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no válido. Use CSV o Excel (.xlsx, .xls)' },
        { status: 400 }
      );
    }

    // Process file content
    const fileContent = await file.text();
    const students = await parseStudentFile(fileContent, file.name);

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron estudiantes válidos en el archivo' },
        { status: 400 }
      );
    }

    // Import to database
    const result = await importStudents(students, eventId);

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Error importing students:', e);
    return NextResponse.json(
      { error: 'Error al importar estudiantes', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
});

// Student validation schema
const studentSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  lastname: z.string().min(1, 'Apellido requerido'),
  email: z.string().email('Email inválido'),
  class: z.string().min(1, 'Curso requerido')
});

// Parse CSV or Excel file content
async function parseStudentFile(content: string, filename: string): Promise<any[]> {
  const isCSV = filename.toLowerCase().endsWith('.csv');
  
  if (isCSV) {
    return parseCSVContent(content);
  } else {
    // For Excel files, we would need a library like xlsx
    // For now, return empty array and suggest CSV format
    throw new Error('Formato Excel no soportado aún. Use formato CSV.');
  }
}

// Parse CSV content
function parseCSVContent(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const students: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const student: any = {};
    headers.forEach((header, index) => {
      student[header] = values[index];
    });

    students.push(student);
  }

  return students;
}

// Import students to database
async function importStudents(students: any[], eventId: string | null) {
  const supabase = await createServerSupabaseServiceClient();
  
  let successCount = 0;
  let errorCount = 0;
  const errorRows: any[] = [];
  const importedStudents: any[] = [];

  for (let i = 0; i < students.length; i++) {
    try {
      const validatedStudent = studentSchema.parse(students[i]);
      
      // Generate QR code (simple format for now)
      const qrCode = `${validatedStudent.class}-${validatedStudent.name.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      
      // Insert into subjects table (students are stored as subjects)
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: `${validatedStudent.name} ${validatedStudent.lastname}`,
          event_id: eventId,
          qr_code: qrCode,
          metadata: {
            email: validatedStudent.email,
            class: validatedStudent.class,
            imported_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      importedStudents.push({
        name: validatedStudent.name,
        lastname: validatedStudent.lastname,
        email: validatedStudent.email,
        class: validatedStudent.class,
        qr_code: qrCode
      });
      
      successCount++;
    } catch (error: any) {
      errorCount++;
      errorRows.push({
        row_number: i + 2, // +2 because index starts at 0 and we skip header
        error: error.message || 'Error desconocido',
        data: students[i]
      });
    }
  }

  return {
    success_count: successCount,
    error_count: errorCount,
    error_rows: errorRows,
    imported_students: importedStudents
  };
}

export const runtime = 'nodejs';
