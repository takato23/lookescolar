import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';

interface SearchResult {
  id: string;
  type: 'event' | 'level' | 'course' | 'student' | 'photo';
  title: string;
  subtitle?: string;
  description?: string;
  path: string[];
  metadata?: {
    photoCount?: number;
    studentCount?: number;
    courseCount?: number;
    uploadDate?: string;
    lastActivity?: string;
    tags?: string[];
  };
  score: number;
  highlighted?: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
}

function calculateScore(text: string, term: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  if (lowerText === term) score += 1.0;
  else if (lowerText.startsWith(term)) score += 0.8;
  else if (lowerText.includes(term)) score += 0.6;
  else if (new RegExp(`\\b${term}`, 'i').test(text)) score += 0.7;

  return Math.min(score, 1.0);
}

function highlightMatch(text: string, term: string): string {
  const safe = term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safe})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  try {
    const { id: eventId } = await context.params;
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
    const types = (searchParams.get('types')?.split(',') || [])
      .map((t) => t.trim())
      .filter(Boolean);
    const hasPhotos = searchParams.get('has_photos') === 'true';
    const approved = searchParams.get('approved') === 'true';
    const recent = searchParams.get('recent') === 'true';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        total: 0,
      });
    }

    const supabase = await createServerSupabaseServiceClient();
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    const includeFolders = types.length === 0 || types.includes('course') || types.includes('level');
    const includeSubjects = types.length === 0 || types.includes('student');
    const includeAssets = types.length === 0 || types.includes('photo');

    // Folders (hierarchy)
    if (includeFolders) {
      const folderQuery = supabase
        .from('folders')
        .select('id, name, path, depth, photo_count, updated_at')
        .eq('event_id', eventId)
        .or(`name.ilike.%${query}%,path.ilike.%${query}%`)
        .order('updated_at', { ascending: recent ? false : true })
        .limit(limit);

      if (hasPhotos) {
        folderQuery.gt('photo_count', 0);
      }

      const { data: folders } = await folderQuery;

      for (const folder of folders ?? []) {
        const title = folder.name ?? 'Carpeta';
        const folderPath = (folder.path ?? title).split('/').filter(Boolean);
        const score = Math.max(
          calculateScore(folder.name ?? '', searchTerm),
          calculateScore(folder.path ?? '', searchTerm)
        );

        if (score <= 0) continue;

        results.push({
          id: folder.id,
          type: (folder.depth ?? 0) === 0 ? 'level' : 'course',
          title,
          subtitle: folder.path ?? undefined,
          description: `Carpeta con ${folder.photo_count ?? 0} fotos`,
          path: folderPath,
          metadata: {
            photoCount: folder.photo_count ?? 0,
            lastActivity: folder.updated_at ?? undefined,
          },
          score,
          highlighted: {
            title: highlightMatch(title, query),
            subtitle: folder.path ? highlightMatch(folder.path, query) : undefined,
          },
        });
      }
    }

    // Subjects (students)
    if (includeSubjects) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, grade, section, updated_at')
        .eq('event_id', eventId)
        .or(`name.ilike.%${query}%,grade.ilike.%${query}%,section.ilike.%${query}%`)
        .order('updated_at', { ascending: recent ? false : true })
        .limit(limit);

      for (const subject of subjects ?? []) {
        const title = subject.name ?? 'Alumno/a';
        const subtitle = [subject.grade, subject.section].filter(Boolean).join(' · ') || undefined;
        const score = Math.max(
          calculateScore(subject.name ?? '', searchTerm),
          calculateScore(subject.grade ?? '', searchTerm),
          calculateScore(subject.section ?? '', searchTerm)
        );

        if (score <= 0) continue;

        results.push({
          id: subject.id,
          type: 'student',
          title,
          subtitle,
          description: 'Sujeto/estudiante',
          path: [title],
          metadata: {
            lastActivity: subject.updated_at ?? undefined,
          },
          score,
          highlighted: {
            title: highlightMatch(title, query),
            subtitle: subtitle ? highlightMatch(subtitle, query) : undefined,
          },
        });
      }
    }

    // Assets (photos) — join folders to filter by event
    if (includeAssets) {
      let assetsQuery = supabase
        .from('assets')
        .select('id, filename, created_at, approved, folders!inner(event_id, path)')
        .eq('folders.event_id', eventId)
        .ilike('filename', `%${query}%`)
        .order('created_at', { ascending: recent ? false : true })
        .limit(limit);

      if (approved) {
        assetsQuery = assetsQuery.eq('approved', true);
      }

      const { data: assets } = await assetsQuery;

      for (const asset of assets ?? []) {
        const title = asset.filename ?? 'Foto';
        const score = calculateScore(title, searchTerm);
        if (score <= 0) continue;

        // folders relationship comes back as object | null
        const folderPathRaw = (asset as any)?.folders?.path as string | undefined;
        const folderPath = folderPathRaw ? folderPathRaw.split('/').filter(Boolean) : [];

        results.push({
          id: asset.id,
          type: 'photo',
          title,
          subtitle: folderPathRaw,
          description: 'Foto',
          path: [...folderPath, title],
          metadata: {
            uploadDate: asset.created_at ?? undefined,
          },
          score,
          highlighted: {
            title: highlightMatch(title, query),
            subtitle: folderPathRaw ? highlightMatch(folderPathRaw, query) : undefined,
          },
        });
      }
    }

    const sorted = results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      results: sorted,
      query,
      total: sorted.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, results: [], error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
