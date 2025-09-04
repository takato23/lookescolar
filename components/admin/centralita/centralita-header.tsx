"use client";

import { Command } from "lucide-react";

export default function CentralitaHeader() {
  return (
    <div className="centralita-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="centralita-logo">
          <Command className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Centralita de Publicación
          </h1>
          <p className="text-gray-600">
            Centro de control para todas las actividades de publicación
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Sistema operativo</span>
        </div>
      </div>
    </div>
  );
}
