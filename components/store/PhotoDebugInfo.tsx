'use client';

import { useEffect } from 'react';

interface PhotoDebugInfoProps {
  photos: any[];
  data: any;
}

export function PhotoDebugInfo({ photos, data }: PhotoDebugInfoProps) {
  useEffect(() => {
    console.log('🔍 PhotoDebugInfo - Full Data:', data);
    console.log('📸 PhotoDebugInfo - Photos Array:', photos);
    console.log('📸 PhotoDebugInfo - Photos Count:', photos.length);
    if (photos.length > 0) {
      console.log('📸 PhotoDebugInfo - First Photo:', photos[0]);
      console.log('📸 PhotoDebugInfo - Photo URLs:', photos.map(p => ({ id: p.id, url: p.url })));
    }
  }, [photos, data]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md p-4 bg-black/90 text-white rounded-lg text-xs font-mono z-50 max-h-96 overflow-auto">
      <h3 className="font-bold mb-2 text-yellow-400">Debug Info</h3>
      <div className="space-y-2">
        <div>
          <span className="text-green-400">Token Type:</span> {data?.tokenType || 'unknown'}
        </div>
        <div>
          <span className="text-green-400">Photos Count:</span> {photos.length}
        </div>
        <div>
          <span className="text-green-400">Is Preselected:</span> {data?.isPreselected ? 'Yes' : 'No'}
        </div>
        <div>
          <span className="text-green-400">Selected Count:</span> {data?.selectedCount || 0}
        </div>
        {photos.length > 0 && (
          <>
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="text-yellow-400 mb-1">First Photo:</div>
              <div className="pl-2 space-y-1">
                <div><span className="text-blue-400">ID:</span> {photos[0].id}</div>
                <div><span className="text-blue-400">URL:</span> {photos[0].url ? '✅ Has URL' : '❌ No URL'}</div>
                {photos[0].url && (
                  <div className="break-all text-[10px] text-gray-400">{photos[0].url.substring(0, 100)}...</div>
                )}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="text-yellow-400 mb-1">All Photo IDs:</div>
              <div className="pl-2 space-y-1">
                {photos.map((photo, idx) => (
                  <div key={photo.id} className="flex items-center gap-2">
                    <span className="text-gray-500">{idx + 1}.</span>
                    <span className="text-blue-300">{photo.id.substring(0, 8)}...</span>
                    <span>{photo.url ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}