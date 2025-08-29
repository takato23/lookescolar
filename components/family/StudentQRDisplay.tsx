'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  QrCode,
  Download,
  Printer,
  Info,
  Camera,
  CheckCircle,
} from 'lucide-react';

interface StudentQRDisplayProps {
  studentId: string;
  studentName: string;
  eventId: string;
  className?: string;
}

interface QRCodeInfo {
  qrCodeId: string;
  dataUrl: string;
  token: string;
  codeValue: string;
  createdAt: string;
  isActive: boolean;
}

export default function StudentQRDisplay({
  studentId,
  studentName,
  eventId,
  className,
}: StudentQRDisplayProps) {
  const [qrInfo, setQRInfo] = useState<QRCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudentQR();
  }, [studentId, eventId]);

  const loadStudentQR = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/family/qr/${studentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('familyToken') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load QR code');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setQRInfo(data.data);
      } else {
        setError('No QR code found for this student');
      }
    } catch (err: any) {
      console.error('QR load error:', err);
      setError(err.message || 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrInfo) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = qrInfo.dataUrl;
      link.download = `QR_${studentName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('QR code downloaded successfully');
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  const printQR = () => {
    if (!qrInfo) return;

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print QR code');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${studentName}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                margin: 0;
              }
              .qr-container {
                max-width: 400px;
                margin: 0 auto;
                border: 2px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                background: white;
              }
              .qr-image {
                margin: 20px 0;
              }
              .student-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .instructions {
                font-size: 12px;
                color: #666;
                margin-top: 15px;
                line-height: 1.4;
              }
              @media print {
                body { margin: 0; }
                .qr-container { border: 1px solid #000; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="student-name">${studentName}</div>
              <div class="qr-image">
                <img src="${qrInfo.dataUrl}" alt="QR Code for ${studentName}" style="max-width: 200px; height: auto;" />
              </div>
              <div class="instructions">
                <strong>Instructions:</strong><br>
                1. Cut out this QR code carefully<br>
                2. Give it to your child to carry during photo sessions<br>
                3. Make sure the QR code is visible when photos are taken<br>
                4. Keep the QR code clean and unfolded
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);

      toast.success('Print dialog opened');
    } catch (error) {
      toast.error('Failed to open print dialog');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading QR code...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!qrInfo) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <QrCode className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-muted-foreground">
            No QR code available for this student
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Student QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="text-center">
          <div className="inline-block rounded-lg border bg-white p-4 shadow-sm">
            <img
              src={qrInfo.dataUrl}
              alt={`QR Code for ${studentName}`}
              className="mx-auto h-48 w-48"
            />
          </div>
        </div>

        {/* Student Info */}
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold">{studentName}</h3>
          <div className="flex justify-center gap-2">
            <Badge variant={qrInfo.isActive ? 'default' : 'secondary'}>
              {qrInfo.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">
              Created: {new Date(qrInfo.createdAt).toLocaleDateString()}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={downloadQR} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={printQR} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Instructions */}
        <Alert>
          <Camera className="h-4 w-4" />
          <AlertDescription>
            <strong>How to use this QR code:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Print and cut out the QR code above</li>
              <li>• Give it to {studentName} to carry during photo sessions</li>
              <li>• Make sure the QR code is visible when photos are taken</li>
              <li>• This helps automatically organize photos by student</li>
              <li>• Keep the QR code clean and unfolded for best results</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Benefits Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-semibold text-blue-900">QR Code Benefits</h4>
              <ul className="mt-1 space-y-1 text-sm text-blue-700">
                <li>• Faster photo identification and organization</li>
                <li>• Reduces errors in photo classification</li>
                <li>• More privacy-friendly than name tags</li>
                <li>• Helps prevent bullying in secondary schools</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Info (for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-muted-foreground text-xs">
            <summary className="cursor-pointer">Technical Details</summary>
            <div className="mt-2 space-y-1 font-mono">
              <p>QR ID: {qrInfo.qrCodeId}</p>
              <p>Token: {qrInfo.token.substring(0, 8)}...</p>
              <p>Code: {qrInfo.codeValue.substring(0, 20)}...</p>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
