'use client';

import { useState } from 'react';
import { Coffee, Calendar, Image as ImageIcon } from 'lucide-react';

const PRODUCTS = [
    { id: 'mug', name: 'Taza Cerámica', icon: Coffee, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80' },
    { id: 'calendar', name: 'Calendario 2025', icon: Calendar, image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=400&q=80' },
];

export default function ProductPreviewMockup() {
    const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);

    return (
        <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all hover:border-blue-500/30">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/20 p-2">
                        <ImageIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">2D Preview</h3>
                        <p className="text-sm text-slate-400">Mockups realistas</p>
                    </div>
                </div>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white">
                {/* Base Product Image */}
                <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover opacity-90"
                />

                {/* Overlay (Simulated) */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="relative overflow-hidden rounded-sm shadow-lg"
                        style={{
                            width: selectedProduct.id === 'mug' ? '35%' : '60%',
                            height: selectedProduct.id === 'mug' ? '40%' : '45%',
                            transform: selectedProduct.id === 'mug' ? 'translateY(10%) rotate(-5deg)' : 'translateY(-10%)',
                            opacity: 0.85,
                            mixBlendMode: 'multiply'
                        }}
                    >
                        <img
                            src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=300&q=80"
                            alt="User Photo"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>

                {/* Product Selector */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 p-1 backdrop-blur-md">
                    {PRODUCTS.map((prod) => (
                        <button
                            key={prod.id}
                            onClick={() => setSelectedProduct(prod)}
                            className={`rounded-full p-2 transition-colors ${selectedProduct.id === prod.id ? 'bg-white text-black' : 'text-white hover:bg-white/20'
                                }`}
                        >
                            <prod.icon className="h-4 w-4" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 text-center">
                <div className="text-lg font-medium text-white">{selectedProduct.name}</div>
                <div className="text-sm text-slate-400">$12.500</div>
            </div>
        </div>
    );
}
