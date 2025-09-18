'use client';

import React, { useState } from 'react';
import {
  Download,
  FileText,
  Table,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel' | 'json';
  template: 'summary' | 'detailed' | 'financial';
  dateRange: { start: string; end: string };
  fields: string[];
}

interface ExportSystemProps {
  events?: any[];
  className?: string;
  onExport?: (options: ExportOptions) => void;
}

export function ExportSystem({
  events = [],
  className,
  onExport,
}: ExportSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    template: 'summary',
    dateRange: {
      start:
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0] || '',
      end: new Date().toISOString().split('T')[0] || '',
    },
    fields: ['school', 'date', 'status', 'photos', 'revenue'],
  });
  const [isExporting, setIsExporting] = useState(false);

  const formatOptions = [
    {
      id: 'pdf',
      name: 'PDF Report',
      icon: FileText,
      description: 'Reporte profesional con gráficos',
    },
    {
      id: 'csv',
      name: 'CSV Data',
      icon: Table,
      description: 'Datos para Excel y análisis',
    },
    {
      id: 'excel',
      name: 'Excel',
      icon: Table,
      description: 'Archivo Excel con formato',
    },
    {
      id: 'json',
      name: 'JSON',
      icon: FileText,
      description: 'Datos estructurados',
    },
  ];

  const availableFields = [
    { id: 'school', name: 'Escuela' },
    { id: 'date', name: 'Fecha' },
    { id: 'status', name: 'Estado' },
    { id: 'photos', name: 'Fotos' },
    { id: 'revenue', name: 'Ingresos' },
    { id: 'clients', name: 'Clientes' },
  ];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate export

      const filteredEvents = events.filter((event) => {
        const eventDate = new Date(event.date);
        const startDate = new Date(exportOptions.dateRange.start);
        const endDate = new Date(exportOptions.dateRange.end);
        return eventDate >= startDate && eventDate <= endDate;
      });

      if (exportOptions.format === 'csv') {
        generateCSV(filteredEvents);
      } else if (exportOptions.format === 'json') {
        generateJSON(filteredEvents);
      } else {
        generatePDF(filteredEvents);
      }

      onExport?.(exportOptions);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = (filteredEvents: any[]) => {
    const headers = exportOptions.fields.map(
      (field) => availableFields.find((f) => f.id === field)?.name || field
    );

    const rows = filteredEvents.map((event) =>
      exportOptions.fields.map((field) => {
        switch (field) {
          case 'school':
            return event.school || '';
          case 'date':
            return new Date(event.date).toLocaleDateString();
          case 'status':
            return event.active ? 'Activo' : 'Borrador';
          case 'photos':
            return event.stats?.totalPhotos || 0;
          case 'revenue':
            return event.stats?.revenue || 0;
          case 'clients':
            return event.stats?.totalSubjects || 0;
          default:
            return '';
        }
      })
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    downloadFile(
      csvContent,
      `eventos-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  };

  const generateJSON = (filteredEvents: any[]) => {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalEvents: filteredEvents.length,
        dateRange: exportOptions.dateRange,
      },
      events: filteredEvents.map((event) => ({
        school: event.school,
        date: event.date,
        status: event.active ? 'active' : 'draft',
        photos: event.stats?.totalPhotos || 0,
        revenue: event.stats?.revenue || 0,
        clients: event.stats?.totalSubjects || 0,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(
      jsonContent,
      `eventos-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  };

  const generatePDF = (filteredEvents: any[]) => {
    const totalRevenue = filteredEvents.reduce(
      (sum, event) => sum + (event.stats?.revenue || 0),
      0
    );
    const totalPhotos = filteredEvents.reduce(
      (sum, event) => sum + (event.stats?.totalPhotos || 0),
      0
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Eventos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .summary { display: flex; justify-content: space-around; margin-bottom: 40px; }
          .metric { text-align: center; }
          .metric h3 { margin: 0; color: #666; }
          .metric .value { font-size: 24px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Eventos</h1>
          <p>Período: ${new Date(exportOptions.dateRange.start).toLocaleDateString()} - ${new Date(exportOptions.dateRange.end).toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <div class="metric">
            <h3>Total Eventos</h3>
            <div class="value">${filteredEvents.length}</div>
          </div>
          <div class="metric">
            <h3>Total Fotos</h3>
            <div class="value">${totalPhotos.toLocaleString()}</div>
          </div>
          <div class="metric">
            <h3>Ingresos Totales</h3>
            <div class="value">$${totalRevenue.toLocaleString()}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              ${exportOptions.fields
                .map(
                  (field) =>
                    `<th>${availableFields.find((f) => f.id === field)?.name || field}</th>`
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredEvents
              .map(
                (event) => `
              <tr>
                ${exportOptions.fields
                  .map((field) => {
                    let value = '';
                    switch (field) {
                      case 'school':
                        value = event.school || '';
                        break;
                      case 'date':
                        value = new Date(event.date).toLocaleDateString();
                        break;
                      case 'status':
                        value = event.active ? 'Activo' : 'Borrador';
                        break;
                      case 'photos':
                        value = (event.stats?.totalPhotos || 0).toString();
                        break;
                      case 'revenue':
                        value =
                          '$' + (event.stats?.revenue || 0).toLocaleString();
                        break;
                      case 'clients':
                        value = (event.stats?.totalSubjects || 0).toString();
                        break;
                    }
                    return `<td>${value}</td>`;
                  })
                  .join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    downloadFile(
      htmlContent,
      `reporte-eventos-${new Date().toISOString().split('T')[0]}.html`,
      'text/html'
    );
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFieldToggle = (fieldId: string) => {
    setExportOptions((prev) => ({
      ...prev,
      fields: prev.fields.includes(fieldId)
        ? prev.fields.filter((f) => f !== fieldId)
        : [...prev.fields, fieldId],
    }));
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn('neural-glass-card', className)}
        variant="outline"
      >
        <Download className="mr-2 h-4 w-4" />
        Exportar
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="neural-glass-card w-full max-w-2xl rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-6">
              <h2 className="text-xl font-bold text-foreground">
                Exportar Datos
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="neural-glass-card hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              {/* Format Selection */}
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Formato
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {formatOptions.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.id}
                        onClick={() =>
                          setExportOptions((prev) => ({
                            ...prev,
                            format: format.id as any,
                          }))
                        }
                        className={cn(
                          'rounded-lg border-2 p-3 text-left transition-all hover:border-blue-400',
                          exportOptions.format === format.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-border'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <h4 className="font-medium text-foreground">
                              {format.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Rango de fechas
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={exportOptions.dateRange.start}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value },
                      }))
                    }
                    className="neural-glass-card"
                  />
                  <Input
                    type="date"
                    value={exportOptions.dateRange.end}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value },
                      }))
                    }
                    className="neural-glass-card"
                  />
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Campos a incluir
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableFields.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 rounded p-2 hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={exportOptions.fields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                        className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                      />
                      <span className="text-sm text-foreground">
                        {field.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-border/50 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isExporting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="neural-fab"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
