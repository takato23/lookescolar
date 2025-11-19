'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X, Plus, Trash2 } from 'lucide-react';
import { StoreProduct } from '@/lib/validations/store-config';
import { nanoid } from 'nanoid';

interface ProductEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: StoreProduct | null;
    onSave: (product: StoreProduct) => void;
}

const DEFAULT_PRODUCT: StoreProduct = {
    id: '',
    name: '',
    description: '',
    price: 0,
    enabled: true,
    type: 'physical',
    options: {
        sizes: [],
        formats: [],
        quality: 'standard',
    },
};

export function ProductEditor({ open, onOpenChange, product, onSave }: ProductEditorProps) {
    const [formData, setFormData] = useState<StoreProduct>(DEFAULT_PRODUCT);
    const [newSize, setNewSize] = useState('');
    const [newFormat, setNewFormat] = useState('');

    useEffect(() => {
        if (open) {
            if (product) {
                setFormData({
                    ...product,
                    options: {
                        sizes: product.options?.sizes || [],
                        formats: product.options?.formats || [],
                        quality: product.options?.quality || 'standard',
                    },
                });
            } else {
                setFormData({
                    ...DEFAULT_PRODUCT,
                    id: `prod_${nanoid(8)}`,
                    options: { sizes: [], formats: [], quality: 'standard' },
                });
            }
        }
    }, [open, product]);

    const handleSave = () => {
        // Basic validation
        if (!formData.name) return;
        onSave(formData);
        onOpenChange(false);
    };

    const addSize = () => {
        if (!newSize.trim()) return;
        setFormData((prev) => ({
            ...prev,
            options: {
                ...prev.options,
                sizes: [...(prev.options?.sizes || []), newSize.trim()],
            },
        }));
        setNewSize('');
    };

    const removeSize = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            options: {
                ...prev.options,
                sizes: (prev.options?.sizes || []).filter((_, i) => i !== index),
            },
        }));
    };

    const addFormat = () => {
        if (!newFormat.trim()) return;
        setFormData((prev) => ({
            ...prev,
            options: {
                ...prev.options,
                formats: [...(prev.options?.formats || []), newFormat.trim()],
            },
        }));
        setNewFormat('');
    };

    const removeFormat = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            options: {
                ...prev.options,
                formats: (prev.options?.formats || []).filter((_, i) => i !== index),
            },
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                    <DialogDescription>
                        Configura los detalles del producto, precios y opciones disponibles.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Basic Info */}
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre del producto</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Foto Impresa 15x21"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: 'physical' | 'digital') =>
                                        setFormData({ ...formData, type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="physical">Físico (Impresión/Objeto)</SelectItem>
                                        <SelectItem value="digital">Digital (Descarga)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe el producto..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <div className="space-y-2">
                                <Label htmlFor="price">Precio ($)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.price / 100}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            price: Math.round((parseFloat(e.target.value) || 0) * 100),
                                        })
                                    }
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <Switch
                                    checked={formData.enabled}
                                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                                />
                                <Label>Producto habilitado</Label>
                            </div>
                        </div>
                    </div>

                    {/* Options Section */}
                    <div className="space-y-4 border-t pt-4">
                        <h4 className="font-medium">Opciones y Variantes</h4>

                        {/* Sizes */}
                        <div className="space-y-2">
                            <Label>Tamaños disponibles</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.options?.sizes?.map((size, index) => (
                                    <Badge key={index} variant="secondary" className="gap-1">
                                        {size}
                                        <button onClick={() => removeSize(index)} className="hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newSize}
                                    onChange={(e) => setNewSize(e.target.value)}
                                    placeholder="Ej: 15x21 cm"
                                    onKeyDown={(e) => e.key === 'Enter' && addSize()}
                                />
                                <Button type="button" variant="outline" onClick={addSize}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Formats */}
                        <div className="space-y-2">
                            <Label>Formatos / Acabados</Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.options?.formats?.map((format, index) => (
                                    <Badge key={index} variant="secondary" className="gap-1">
                                        {format}
                                        <button onClick={() => removeFormat(index)} className="hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newFormat}
                                    onChange={(e) => setNewFormat(e.target.value)}
                                    placeholder="Ej: Mate, Brillante"
                                    onKeyDown={(e) => e.key === 'Enter' && addFormat()}
                                />
                                <Button type="button" variant="outline" onClick={addFormat}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Quality */}
                        <div className="space-y-2">
                            <Label>Calidad de impresión</Label>
                            <Select
                                value={formData.options?.quality || 'standard'}
                                onValueChange={(value: 'standard' | 'premium') =>
                                    setFormData({
                                        ...formData,
                                        options: { ...formData.options, quality: value },
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Estándar</SelectItem>
                                    <SelectItem value="premium">Premium (Papel fotográfico alta calidad)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>Guardar Producto</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
