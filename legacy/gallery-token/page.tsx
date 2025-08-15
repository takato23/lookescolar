"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";

interface ApiPhoto {
  id: string;
  preview_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  filename?: string | null;
}

interface ApiResponse {
  success: boolean;
  subject: {
    id: string;
    name: string;
    grade_section?: string | null;
    event: { id: string; name?: string | null; school_name?: string | null } | null;
  } | null;
  photos: ApiPhoto[];
  total: number;
  pagination: { page: number; limit: number; total: number; total_pages: number; has_more: boolean };
  error?: string;
}

export default function PublicTokenGalleryPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params?.token as string;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [page, setPage] = useState(1);

  const limit = useMemo(() => {
    const l = Number(searchParams.get("limit") || 60);
    return Math.min(Math.max(l, 12), 100);
  }, [searchParams]);

  const fetchPage = useCallback(
    async (pageToLoad: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const url = `/api/family/gallery-simple/${encodeURIComponent(token)}?page=${pageToLoad}&limit=${limit}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const msg = `Error ${res.status}`;
          throw new Error(msg);
        }
        const json: ApiResponse = await res.json();
        if (json.success !== true) {
          throw new Error(json.error || "No se pudo cargar la galería");
        }
        setData(json);
        setPhotos((prev) => (append ? [...prev, ...(json.photos || [])] : (json.photos || [])));
        setPage(pageToLoad);
      } catch (e: any) {
        setError(e?.message || "Error desconocido");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, limit]
  );

  useEffect(() => {
    if (token) fetchPage(1, false);
  }, [token, fetchPage]);

  const hasMore = data?.pagination?.has_more === true;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Galería</h1>
          {data?.subject?.event && (
            <p className="text-sm text-gray-600">
              {data.subject.event.school_name ? (
                <>
                  {data.subject.event.school_name}
                  {data.subject.event.name ? ` · ${data.subject.event.name}` : ""}
                </>
              ) : (
                data.subject.event.name || ""
              )}
            </p>
          )}
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700">
          {data?.total ?? 0} fotos
        </div>
      </div>

      {/* Error / Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-full animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-xl bg-white shadow">
              {p.preview_url ? (
                <Image
                  src={p.preview_url}
                  alt={p.filename || "Foto"}
                  width={p.width || 800}
                  height={p.height || 1200}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <div className="aspect-[3/4] w-full bg-gray-200" />
              )}
            </figure>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && !error && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchPage(page + 1, true)}
            disabled={loadingMore}
            className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-white shadow hover:from-purple-700 hover:to-pink-700 disabled:opacity-60"
          >
            {loadingMore ? "Cargando..." : "Ver más"}
          </button>
        </div>
      )}
    </div>
  );
}
