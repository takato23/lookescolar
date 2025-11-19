'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Settings2 } from 'lucide-react';

type PlanCode = 'free' | 'basic' | 'pro' | 'premium';

interface PlanUsageSummary {
    activeEvents: number;
    busiestPhotoEvent?: {
        eventId: string;
        eventName: string | null;
        photoCount: number;
    };
    busiestShareEvent?: {
        eventId: string;
        eventName: string | null;
        shareCount: number;
    };
}

interface PlanApiResponse {
    plan: {
        code: PlanCode;
        name: string;
        description: string;
        maxEvents: number | null;
        maxPhotosPerEvent: number | null;
        maxSharesPerEvent: number | null;
        priceMonthly: number | null;
        currency: string;
        status: string;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
        trialEndsAt: string | null;
    };
    usage: PlanUsageSummary;
}

const PLAN_OPTIONS: Array<{
    code: PlanCode;
    name: string;
    description: string;
    priceLabel: string;
    limits: { label: string; value: string }[];
}> = [
        {
            code: 'free',
            name: 'Free',
            description: 'Empezá gratis con 2 eventos activos.',
            priceLabel: 'Gratis',
            limits: [
                { label: 'Eventos activos', value: '2' },
                { label: 'Fotos por evento', value: '200' },
                { label: 'Shares por evento', value: '3' },
            ],
        },
        {
            code: 'basic',
            name: 'Básico',
            description: 'Ideal para escuelas pequeñas que suben hasta 1.000 fotos.',
            priceLabel: 'ARS 14.999 / mes',
            limits: [
                { label: 'Eventos activos', value: '8' },
                { label: 'Fotos por evento', value: '1.000' },
                { label: 'Shares por evento', value: '20' },
            ],
        },
        {
            code: 'pro',
            name: 'Pro',
            description: 'Diseñado para equipos con múltiples fotógrafos y catálogos grandes.',
            priceLabel: 'ARS 34.999 / mes',
            limits: [
                { label: 'Eventos activos', value: '25' },
                { label: 'Fotos por evento', value: '5.000' },
                { label: 'Shares por evento', value: '50' },
            ],
        },
        {
            code: 'premium',
            name: 'Premium',
            description: 'Cobertura ilimitada, ideal para franquicias o redes de estudios.',
            priceLabel: 'ARS 69.999 / mes',
            limits: [
                { label: 'Eventos activos', value: 'Ilimitado' },
                { label: 'Fotos por evento', value: '20.000' },
                { label: 'Shares por evento', value: '200' },
            ],
        },
    ];

export function PlanSettings() {
    const [planData, setPlanData] = useState<PlanApiResponse | null>(null);
    const [planLoading, setPlanLoading] = useState(true);
    const [planSaving, setPlanSaving] = useState(false);

    const loadPlanData = useCallback(async () => {
        try {
            setPlanLoading(true);
            const response = await fetch('/api/admin/tenant-plan');
            if (!response.ok) {
                throw new Error('Request failed');
            }
            const data = (await response.json()) as PlanApiResponse;
            setPlanData(data);
        } catch (error) {
            console.error('Error loading plan data:', error);
            toast.error('No se pudo cargar la información del plan');
        } finally {
            setPlanLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlanData();
    }, [loadPlanData]);

    const handlePlanUpdate = useCallback(
        async (planCode: PlanCode) => {
            if (planSaving) return;
            try {
                setPlanSaving(true);
                const response = await fetch('/api/admin/tenant-plan', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ planCode }),
                });

                if (!response.ok) {
                    const errorPayload = await response.json().catch(() => null);
                    throw new Error(errorPayload?.error || 'Error al actualizar el plan');
                }

                const data = (await response.json()) as PlanApiResponse & {
                    updated?: boolean;
                };
                setPlanData({ plan: data.plan, usage: data.usage });
                toast.success('Plan actualizado correctamente');
            } catch (error) {
                console.error('Error updating plan:', error);
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo actualizar el plan'
                );
            } finally {
                setPlanSaving(false);
            }
        },
        [planSaving]
    );

    const formatPrice = useCallback((value: number | null, currency: string) => {
        if (value == null || value === 0) {
            return 'Gratis';
        }
        try {
            return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: currency || 'ARS',
                maximumFractionDigits: 0,
            }).format(value);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return `${currency || 'ARS'} ${value}`;
        }
    }, []);

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Settings2 className="h-5 w-5" />
                    Plan y Límites
                </h2>
                <p className="text-sm text-white/70">
                    Revisá el estado del plan actual, su uso y actualizalo cuando sea necesario.
                </p>
            </div>

            {planLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                    Cargando plan actual...
                </div>
            ) : planData ? (
                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-lg font-semibold text-white">
                                    Plan actual: {planData.plan.name}
                                </h3>
                                <p className="text-sm text-white/70">
                                    {planData.plan.description}
                                </p>
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs uppercase text-white/50">
                                        Precio
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-white">
                                        {formatPrice(planData.plan.priceMonthly, planData.plan.currency)}
                                    </p>
                                    <p className="text-[11px] text-white/60">por mes</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs uppercase text-white/50">
                                        Eventos activos
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-white">
                                        {planData.plan.maxEvents != null
                                            ? `${planData.usage.activeEvents} / ${planData.plan.maxEvents}`
                                            : `${planData.usage.activeEvents} · Sin límite`}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                    <p className="text-xs uppercase text-white/50">
                                        Estado
                                    </p>
                                    <p className="mt-1 text-lg font-semibold capitalize text-white">
                                        {planData.plan.status}
                                    </p>
                                    {planData.plan.trialEndsAt && (
                                        <p className="text-[11px] text-white/60">
                                            Trial hasta{' '}
                                            {new Date(planData.plan.trialEndsAt).toLocaleDateString('es-AR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {PLAN_OPTIONS.map((option) => {
                                const isCurrent = planData.plan.code === option.code;
                                return (
                                    <div
                                        key={option.code}
                                        className={clsx(
                                            'rounded-2xl border p-5 transition-colors',
                                            isCurrent
                                                ? 'border-primary/70 bg-primary/10'
                                                : 'border-white/10 bg-white/5 hover:border-primary/40'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-lg font-semibold text-white">
                                                    {option.name}
                                                </h4>
                                                <p className="text-sm text-white/70">
                                                    {option.description}
                                                </p>
                                            </div>
                                            <span className="text-sm font-medium text-white">
                                                {option.priceLabel}
                                            </span>
                                        </div>
                                        <ul className="mt-4 space-y-2 text-sm text-white/65">
                                            {option.limits.map((limit) => (
                                                <li key={limit.label} className="flex items-center gap-2">
                                                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary/70" />
                                                    <span>
                                                        {limit.label}:{' '}
                                                        <span className="font-medium text-white">
                                                            {limit.value}
                                                        </span>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            onClick={() => handlePlanUpdate(option.code)}
                                            disabled={isCurrent || planSaving}
                                            className={clsx(
                                                'mt-4 w-full rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/60',
                                                isCurrent
                                                    ? 'bg-primary/10 text-white'
                                                    : 'bg-primary text-white hover:bg-primary/80',
                                                planSaving && !isCurrent ? 'opacity-70' : ''
                                            )}
                                        >
                                            {isCurrent
                                                ? 'Plan actual'
                                                : planSaving
                                                    ? 'Actualizando...'
                                                    : `Cambiar a ${option.name}`}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h4 className="text-sm font-semibold text-white">Uso destacado</h4>
                            <ul className="mt-4 space-y-3 text-sm text-white/70">
                                <li>
                                    <span className="block text-xs uppercase text-white/50">
                                        Evento con más fotos
                                    </span>
                                    <span className="font-medium text-white">
                                        {planData.usage.busiestPhotoEvent
                                            ? `${planData.usage.busiestPhotoEvent.photoCount} fotos · ${planData.usage.busiestPhotoEvent.eventName ?? 'Sin nombre'
                                            }`
                                            : 'Sin fotos cargadas'}
                                    </span>
                                    {planData.plan.maxPhotosPerEvent != null && (
                                        <span className="block text-xs text-white/55">
                                            Límite por evento: {planData.plan.maxPhotosPerEvent}
                                        </span>
                                    )}
                                </li>
                                <li>
                                    <span className="block text-xs uppercase text-white/50">
                                        Evento con más shares
                                    </span>
                                    <span className="font-medium text-white">
                                        {planData.usage.busiestShareEvent
                                            ? `${planData.usage.busiestShareEvent.shareCount} shares · ${planData.usage.busiestShareEvent.eventName ?? 'Sin nombre'
                                            }`
                                            : 'Sin shares creados'}
                                    </span>
                                    {planData.plan.maxSharesPerEvent != null && (
                                        <span className="block text-xs text-white/55">
                                            Límite por evento: {planData.plan.maxSharesPerEvent}
                                        </span>
                                    )}
                                </li>
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-white/60">
                            ¿Necesitás límites mayores o facturación personalizada? Contactá a soporte para planes Enterprise o ajustes a medida.
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                    No se pudo cargar la información del plan.
                </div>
            )}
        </div>
    );
}
