import React from 'react';
import { cn } from '@/lib/utils';
import { Image as ImageIcon } from 'lucide-react';

export type MockupType = 'print' | 'frame' | 'canvas' | 'digital' | 'package';

interface SmartMockupProps {
    type: MockupType | string;
    photoUrl?: string;
    className?: string;
    aspectRatio?: 'portrait' | 'landscape' | 'square';
}

export function SmartMockup({
    type,
    photoUrl,
    className,
    aspectRatio = 'portrait'
}: SmartMockupProps) {

    const getAspectRatioClass = () => {
        switch (aspectRatio) {
            case 'landscape': return 'aspect-[4/3]';
            case 'square': return 'aspect-square';
            default: return 'aspect-[3/4]';
        };

        const renderContent = () => {
            if (!photoUrl) {
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs uppercase tracking-widest font-medium">Vista Previa</span>
                    </div>
                );
            }
            return (
                <img
                    src={photoUrl}
                    alt="Mockup preview"
                    className="w-full h-full object-cover"
                />
            );
        };

        // Canvas Style
        if (type === 'canvas' || type.includes('canvas')) {
            return (
                <div className={cn("relative p-4", className)}>
                    <div className={cn("relative shadow-xl transform transition-transform hover:scale-[1.02]", getAspectRatioClass())}>
                        {/* Photorealistic Canvas Mockup */}
                        <div className="relative w-full h-full">
                            <img
                                src="/placeholders/mockups/canvas-print.png"
                                alt="Canvas Mockup"
                                className="absolute inset-0 w-full h-full object-cover rounded shadow-md pointer-events-none z-10"
                            />
                            {/* Content Area - Positioned to match the canvas in the mockup */}
                            <div className="absolute top-[10%] left-[10%] w-[80%] h-[80%] z-0 transform">
                                {/* Note: In a real implementation, we would need to precisely position this relative to the perspective of the mockup. 
                                 For now, just showing the image directly is cleaner if we don't have perspective transform logic. 
                             */}
                                {/* Simplification: Just show the image with a canvas texture overlay if no photoUrl, OR better: */}

                                {photoUrl ? (
                                    <img src={photoUrl} className="w-full h-full object-cover mix-blend-multiply opacity-90" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // Framed Style
    if (type === 'frame' || type.includes('frame')) {
        return (
            <div className={cn("relative p-4", className)}>
                <div className={cn("relative bg-white shadow-2xl ring-1 ring-black/5 transform transition-transform hover:scale-[1.02]", getAspectRatioClass())}>
                    {/* Frame Border */}
                    <div className="absolute inset-0 border-[16px] border-slate-900 border-t-slate-800 border-l-slate-800 z-20 pointer-events-none shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5)]"></div>

                    {/* Matting (Passepartout) */}
                    <div className="absolute inset-[16px] border-[24px] border-white z-10 pointer-events-none shadow-[inset_1px_1px_4px_rgba(0,0,0,0.1)]"></div>

                    {/* Image */}
                    <div className="absolute inset-[40px] bg-gray-100 overflow-hidden">
                        {renderContent()}
                        {/* Glass Reflection */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent z-30 pointer-events-none"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Print Style (Default for 'print', 'package', etc)
    return (
        <div className={cn("relative p-6", className)}>
            <div className={cn("relative bg-white shadow-lg transform rotate-1 transition-transform hover:rotate-0 hover:scale-105 duration-300", getAspectRatioClass())}>
                <div className="absolute inset-2 border border-black/5"></div>
                <div className="w-full h-full p-3 bg-white">
                    <div className="w-full h-full bg-gray-50 overflow-hidden relative">
                        {renderContent()}
                        {/* Paper sheen */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>
            {/* Stack effect for packages */}
            {type === 'package' && (
                <>
                    <div className={cn("absolute top-5 left-7 -z-10 bg-white shadow-md transform -rotate-2 w-[90%] h-[90%] border border-gray-100", getAspectRatioClass())}></div>
                    <div className={cn("absolute top-4 left-4 -z-20 bg-white shadow-sm transform -rotate-4 w-[90%] h-[90%] border border-gray-100", getAspectRatioClass())}></div>
                </>
            )}
        </div>
    );
}
