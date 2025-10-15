/**
 * 💀 Skeleton loading premium para configuración de tienda
 * Proporciona feedback visual durante la carga
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const StoreConfigSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-sm mx-auto px-4 sm:max-w-md md:max-w-2xl lg:max-w-4xl">
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 bg-muted rounded w-24"></div>
            <div className="h-10 bg-muted rounded w-32"></div>
          </div>
        </div>

        {/* Configuración general skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/4"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
              <div className="h-6 bg-muted rounded w-12"></div>
            </div>
            <div className="h-px bg-muted"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Productos skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-4 w-4 bg-muted rounded"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-12"></div>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Envío skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
              <div className="h-6 bg-muted rounded w-12"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
