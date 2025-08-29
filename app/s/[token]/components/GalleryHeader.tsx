/**
 * GALLERY HEADER COMPONENT
 * 
 * Displays gallery title, context info, and key stats
 * Features: Responsive design, scope indicators, expiry warnings
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ClockIcon, 
  ShieldIcon,
  DownloadIcon,
  EyeIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { GalleryContext } from '@/lib/services/hierarchical-gallery.service';
import { formatDate } from '@/lib/utils';

interface GalleryHeaderProps {
  context: GalleryContext;
  stats: {
    totalFolders: number;
    totalAssets: number;
    totalSize: number;
  };
  icon: string;
  label: string;
}

export function GalleryHeader({ context, stats, icon, label }: GalleryHeaderProps) {
  const isExpiringSoon = () => {
    if (!context.expiresAt) return false;
    
    const now = new Date();
    const expiryDate = new Date(context.expiresAt);
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const getAccessLevelColor = () => {
    switch (context.accessLevel) {
      case 'full': return context.canDownload ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
      case 'read_only': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScopeColor = () => {
    switch (context.scope) {
      case 'event': return 'bg-purple-100 text-purple-800';
      case 'course': return 'bg-blue-100 text-blue-800';
      case 'family': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-6">
        {/* Main Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{icon}</div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {context.resourceName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getScopeColor()}>
                  {label}
                </Badge>
                <Badge className={getAccessLevelColor()}>
                  {context.canDownload ? (
                    <>
                      <DownloadIcon className="h-3 w-3 mr-1" />
                      Download Enabled
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-3 w-3 mr-1" />
                      View Only
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600">{stats.totalFolders}</div>
              <div className="text-gray-600">Folders</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-green-600">{stats.totalAssets}</div>
              <div className="text-gray-600">Photos</div>
            </div>
          </div>
        </div>

        {/* Security & Expiry Info */}
        <div className="space-y-3">
          {/* Expiry Warning */}
          {isExpiringSoon() && context.expiresAt && (
            <Alert variant="warning">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    This gallery access expires soon: <strong>{formatDate(context.expiresAt)}</strong>
                  </span>
                  <Badge variant="outline" className="text-orange-700 border-orange-300">
                    Expiring Soon
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Access Info Card */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldIcon className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Secure Access</span>
                  </div>
                  
                  <div className="h-4 w-px bg-gray-300" />
                  
                  <div>
                    Access Level: <span className="font-medium">{context.accessLevel}</span>
                  </div>
                  
                  {context.expiresAt && (
                    <>
                      <div className="h-4 w-px bg-gray-300" />
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3 text-gray-600" />
                        <span>Expires: {formatDate(context.expiresAt)}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  LookEscolar Gallery System
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}