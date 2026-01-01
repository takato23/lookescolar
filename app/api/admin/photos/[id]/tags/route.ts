import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/admin-auth.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const GET = withAdminAuth(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const { id } = paramsSchema.parse(params);
    const supabase = await createServerSupabaseServiceClient();
    const studentsMap = new Map<string, { id: string; name: string }>();

    const { data: photoStudents, error: photoStudentsError } = await supabase
      .from('photo_students')
      .select('students:students(id, name)')
      .eq('photo_id', id);

    if (photoStudentsError) {
      console.warn('Failed to load photo_students tags:', photoStudentsError);
    } else {
      (photoStudents || []).forEach((row: any) => {
        if (row?.students?.id) {
          studentsMap.set(row.students.id, {
            id: row.students.id,
            name: row.students.name || 'Sin nombre',
          });
        }
      });
    }

    if (studentsMap.size === 0) {
      const { data: subjectRows, error: subjectError } = await supabase
        .from('photo_subjects')
        .select('subjects:subjects(id, name)')
        .eq('photo_id', id);

      if (subjectError) {
        console.warn('Failed to load photo_subjects tags:', subjectError);
      } else {
        (subjectRows || []).forEach((row: any) => {
          if (row?.subjects?.id) {
            studentsMap.set(row.subjects.id, {
              id: row.subjects.id,
              name: row.subjects.name || 'Sin nombre',
            });
          }
        });
      }
    }

    return NextResponse.json({
      students: Array.from(studentsMap.values()),
    });
  }
);
