'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Image,
  WifiOff,
  Wifi,
  Save,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OfflineQRScan {
  id: string;
  qrCode: string;
  timestamp: Date;
  studentData?: StudentInfo;
  eventId?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

interface StudentInfo {
  id: string;
  name: string;
  code: string;
  eventId?: string;
  courseId?: string;
}

interface OfflineQRScannerProps {
  className?: string;
  onScan?: (data: OfflineQRScan) => void;
  eventId?: string;
}

export function OfflineQRScanner({
  className,
  onScan,
  eventId,
}: OfflineQRScannerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingScans, setPendingScans] = useState<OfflineQRScan[]>([]);
  const [syncedScans, setSyncedScans] = useState<OfflineQRScan[]>([]);
  const [failedScans, setFailedScans] = useState<OfflineQRScan[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'scan' | 'pending' | 'synced' | 'failed'
  >('scan');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Storage key for offline scans
  const STORAGE_KEY = `offline_qr_scans_${eventId || 'default'}`;

  /**
   * Load scans from localStorage on mount
   */
  useEffect(() => {
    loadScansFromStorage();

    // Check online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Attempt to sync pending scans periodically
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingScans();
      }
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(syncInterval);
    };
  }, []);

  /**
   * Load scans from localStorage
   */
  const loadScansFromStorage = useCallback(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const scans: OfflineQRScan[] = parsedData.map((scan: any) => ({
          ...scan,
          timestamp: new Date(scan.timestamp),
        }));

        // Categorize scans
        const pending = scans.filter((s) => s.syncStatus === 'pending');
        const synced = scans.filter((s) => s.syncStatus === 'synced');
        const failed = scans.filter((s) => s.syncStatus === 'failed');

        setPendingScans(pending);
        setSyncedScans(synced);
        setFailedScans(failed);
      }
    } catch (error) {
      console.error('Failed to load offline scans:', error);
      toast.error('Failed to load saved scans');
    }
  }, [STORAGE_KEY]);

  /**
   * Save scans to localStorage
   */
  const saveScansToStorage = useCallback(
    (scans: OfflineQRScan[]) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
      } catch (error) {
        console.error('Failed to save scans to storage:', error);
        toast.error('Failed to save scan data');
      }
    },
    [STORAGE_KEY]
  );

  /**
   * Handle manual QR code input
   */
  const handleManualInput = async (qrCode: string) => {
    if (!qrCode.trim()) return;

    setIsProcessing(true);

    try {
      // Create offline scan record
      const newScan: OfflineQRScan = {
        id: crypto.randomUUID(),
        qrCode: qrCode.trim(),
        timestamp: new Date(),
        eventId,
        syncStatus: 'pending',
        retryCount: 0,
      };

      // Try to validate immediately if online
      if (navigator.onLine) {
        try {
          const response = await fetch('/api/qr/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              qrCode: qrCode.trim(),
              eventId,
            }),
          });

          if (response.ok) {
            const validationResult = await response.json();
            if (validationResult.success && validationResult.valid) {
              newScan.studentData = validationResult.data;
              newScan.syncStatus = 'synced';
              toast.success(`Student detected: ${validationResult.data.name}`);
            } else {
              newScan.syncStatus = 'failed';
              toast.error('QR code not recognized');
            }
          } else {
            newScan.syncStatus = 'pending'; // Will retry later
          }
        } catch (error) {
          newScan.syncStatus = 'pending'; // Will retry later
        }
      }

      // Add to pending scans
      const updatedPending = [...pendingScans, newScan];
      setPendingScans(updatedPending);

      // Save to storage
      const allScans = [
        ...updatedPending,
        ...syncedScans,
        ...failedScans,
        newScan,
      ];
      saveScansToStorage(allScans);

      // Callback
      onScan?.(newScan);

      toast.success('QR code saved for offline processing');
    } catch (error) {
      console.error('Failed to process QR code:', error);
      toast.error('Failed to process QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle image upload for QR detection
   */
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Read image file
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        if (!imageData) return;

        // In a real implementation, you would process the image here
        // For this example, we'll simulate finding a QR code
        setTimeout(() => {
          // Simulate QR detection
          const simulatedQR = `SIMULATED_QR_${Date.now()}`;
          handleManualInput(simulatedQR);
        }, 1000);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to process image:', error);
      toast.error('Failed to process image');
      setIsProcessing(false);
    }
  };

  /**
   * Sync pending scans with server
   */
  const syncPendingScans = async () => {
    if (pendingScans.length === 0) return;

    const scansToSync = [...pendingScans];
    const updatedPending: OfflineQRScan[] = [];
    const updatedSynced: OfflineQRScan[] = [...syncedScans];
    const updatedFailed: OfflineQRScan[] = [...failedScans];

    for (const scan of scansToSync) {
      try {
        // Skip scans that have been retried too many times
        if (scan.retryCount > 3) {
          updatedFailed.push({ ...scan, syncStatus: 'failed' });
          continue;
        }

        const response = await fetch('/api/qr/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrCode: scan.qrCode,
            eventId: scan.eventId,
          }),
        });

        if (response.ok) {
          const validationResult = await response.json();
          if (validationResult.success && validationResult.valid) {
            // Update scan with student data and mark as synced
            const updatedScan: OfflineQRScan = {
              ...scan,
              studentData: validationResult.data,
              syncStatus: 'synced',
            };
            updatedSynced.push(updatedScan);
            toast.success(`Synced student: ${validationResult.data.name}`);
          } else {
            // Mark as failed
            const updatedScan: OfflineQRScan = {
              ...scan,
              syncStatus: 'failed',
              retryCount: scan.retryCount + 1,
            };
            updatedFailed.push(updatedScan);
          }
        } else {
          // Retry later
          const updatedScan: OfflineQRScan = {
            ...scan,
            retryCount: scan.retryCount + 1,
          };
          updatedPending.push(updatedScan);
        }
      } catch (error) {
        // Retry later
        const updatedScan: OfflineQRScan = {
          ...scan,
          retryCount: scan.retryCount + 1,
        };
        updatedPending.push(updatedScan);
      }
    }

    // Update state
    setPendingScans(updatedPending);
    setSyncedScans(updatedSynced);
    setFailedScans(updatedFailed);

    // Save to storage
    const allScans = [...updatedPending, ...updatedSynced, ...updatedFailed];
    saveScansToStorage(allScans);

    // Show sync summary
    const syncedCount = updatedSynced.length - syncedScans.length;
    const failedCount = updatedFailed.length - failedScans.length;

    if (syncedCount > 0) {
      toast.success(`Synced ${syncedCount} scans`);
    }

    if (failedCount > 0) {
      toast.warning(`${failedCount} scans failed to sync`);
    }
  };

  /**
   * Retry failed scans
   */
  const retryFailedScans = () => {
    const updatedFailed = failedScans.map((scan) => ({
      ...scan,
      syncStatus: 'pending' as const,
      retryCount: 0,
    }));

    const updatedPending = [...pendingScans, ...updatedFailed];
    setPendingScans(updatedPending);
    setFailedScans([]);

    // Save to storage
    const allScans = [...updatedPending, ...syncedScans];
    saveScansToStorage(allScans);

    toast.success(`Retrying ${updatedFailed.length} failed scans`);
  };

  /**
   * Export scans to file
   */
  const exportScans = () => {
    try {
      const data = {
        pending: pendingScans,
        synced: syncedScans,
        failed: failedScans,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr_scans_${eventId || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Scans exported successfully');
    } catch (error) {
      console.error('Failed to export scans:', error);
      toast.error('Failed to export scans');
    }
  };

  /**
   * Import scans from file
   */
  const importScans = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        // Merge imported scans
        const importedPending = data.pending || [];
        const importedSynced = data.synced || [];
        const importedFailed = data.failed || [];

        const updatedPending = [...pendingScans, ...importedPending];
        const updatedSynced = [...syncedScans, ...importedSynced];
        const updatedFailed = [...failedScans, ...importedFailed];

        setPendingScans(updatedPending);
        setSyncedScans(updatedSynced);
        setFailedScans(updatedFailed);

        // Save to storage
        const allScans = [
          ...updatedPending,
          ...updatedSynced,
          ...updatedFailed,
        ];
        saveScansToStorage(allScans);

        toast.success('Scans imported successfully');
      } catch (error) {
        console.error('Failed to import scans:', error);
        toast.error('Failed to import scans');
      }
    };

    reader.readAsText(file);
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-600" />
            Offline QR Scanner
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}

            <Badge variant="outline">
              <Database className="mr-1 h-3 w-3" />
              {pendingScans.length + syncedScans.length + failedScans.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium',
              activeTab === 'scan'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('scan')}
          >
            Scan
          </button>
          <button
            className={cn(
              'flex items-center gap-1 px-4 py-2 text-sm font-medium',
              activeTab === 'pending'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('pending')}
          >
            Pending
            {pendingScans.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingScans.length}
              </Badge>
            )}
          </button>
          <button
            className={cn(
              'flex items-center gap-1 px-4 py-2 text-sm font-medium',
              activeTab === 'synced'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('synced')}
          >
            Synced
            {syncedScans.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {syncedScans.length}
              </Badge>
            )}
          </button>
          <button
            className={cn(
              'flex items-center gap-1 px-4 py-2 text-sm font-medium',
              activeTab === 'failed'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('failed')}
          >
            Failed
            {failedScans.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {failedScans.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Manual Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="h-4 w-4" />
                    Manual Input
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter QR code manually when camera is not available
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter QR code"
                      className="flex-1 rounded-md border px-3 py-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          handleManualInput(target.value);
                          target.value = '';
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        const input = (e.target as HTMLElement)
                          .previousElementSibling as HTMLInputElement;
                        handleManualInput(input.value);
                        input.value = '';
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Add'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Image className="h-4 w-4" />
                    Image Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload images containing QR codes for offline processing
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      multiple
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      variant="outline"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Select Images
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sync Controls */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={syncPendingScans}
                disabled={
                  !isOnline || pendingScans.length === 0 || isProcessing
                }
                variant="outline"
              >
                <Wifi className="mr-2 h-4 w-4" />
                Sync Now
              </Button>

              <Button
                onClick={retryFailedScans}
                disabled={failedScans.length === 0 || isProcessing}
                variant="outline"
              >
                <Clock className="mr-2 h-4 w-4" />
                Retry Failed
              </Button>

              <Button
                onClick={exportScans}
                disabled={isProcessing}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>

              <input
                type="file"
                className="hidden"
                accept=".json"
                onChange={importScans}
                id="import-scans"
              />
              <label htmlFor="import-scans">
                <Button as="span" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </label>
            </div>
          </div>
        )}

        {/* Pending Scans Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-2">
            {pendingScans.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Clock className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>No pending scans</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {pendingScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-yellow-100 p-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {scan.studentData?.name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {scan.qrCode.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {scan.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Synced Scans Tab */}
        {activeTab === 'synced' && (
          <div className="space-y-2">
            {syncedScans.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>No synced scans</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {syncedScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {scan.studentData?.name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {scan.qrCode.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {scan.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Failed Scans Tab */}
        {activeTab === 'failed' && (
          <div className="space-y-2">
            {failedScans.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p>No failed scans</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {failedScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-red-100 p-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {scan.studentData?.name || 'Unknown Student'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {scan.qrCode.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {scan.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
