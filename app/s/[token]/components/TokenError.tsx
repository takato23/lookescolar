/**
 * TOKEN ERROR COMPONENT
 * 
 * Displays user-friendly error messages for token validation failures
 * Features: Error categorization, helpful guidance, no information leakage
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShieldXIcon, 
  ClockIcon, 
  KeyIcon, 
  AlertTriangleIcon,
  HomeIcon,
  RefreshCwIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TokenErrorProps {
  reason: string;
  token: string;
  error?: string;
}

export function TokenError({ reason, token, error }: TokenErrorProps) {
  const router = useRouter();

  const getErrorInfo = () => {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('expired')) {
      return {
        icon: <ClockIcon className="h-12 w-12 text-orange-500" />,
        title: 'Access Expired',
        description: 'This gallery link has expired and is no longer valid.',
        suggestions: [
          'Contact your school or teacher for a new access link',
          'Check if you received an updated link via email or WhatsApp'
        ],
        severity: 'warning' as const
      };
    }
    
    if (lowerReason.includes('revoked')) {
      return {
        icon: <ShieldXIcon className="h-12 w-12 text-red-500" />,
        title: 'Access Revoked',
        description: 'This gallery link has been disabled by the administrator.',
        suggestions: [
          'Contact your school for assistance',
          'Verify you are using the most recent link provided'
        ],
        severity: 'destructive' as const
      };
    }
    
    if (lowerReason.includes('not found') || lowerReason.includes('invalid')) {
      return {
        icon: <KeyIcon className="h-12 w-12 text-gray-500" />,
        title: 'Invalid Access Link',
        description: 'This gallery link is not valid or may have been mistyped.',
        suggestions: [
          'Double-check the link you received',
          'Try copying and pasting the full link',
          'Make sure the link is complete (no missing characters)'
        ],
        severity: 'destructive' as const
      };
    }
    
    if (lowerReason.includes('exhausted') || lowerReason.includes('max uses')) {
      return {
        icon: <AlertTriangleIcon className="h-12 w-12 text-yellow-500" />,
        title: 'Access Limit Reached',
        description: 'This gallery link has reached its maximum number of uses.',
        suggestions: [
          'Contact your school for a new access link',
          'Ask about extending the access limit'
        ],
        severity: 'warning' as const
      };
    }
    
    // Generic error
    return {
      icon: <AlertTriangleIcon className="h-12 w-12 text-red-500" />,
      title: 'Access Error',
      description: 'Unable to access this gallery at the moment.',
      suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if the problem persists'
      ],
      severity: 'destructive' as const
    };
  };

  const errorInfo = getErrorInfo();
  
  const handleRetry = () => {
    router.refresh();
  };

  const goToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {errorInfo.icon}
          </div>
          <CardTitle className="text-xl">{errorInfo.title}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-center text-gray-600">
            {errorInfo.description}
          </p>

          {/* Error Details (in development) */}
          {process.env.NODE_ENV === 'development' && (
            <Alert variant="secondary">
              <AlertDescription className="text-xs font-mono">
                <div><strong>Reason:</strong> {reason}</div>
                {error && <div><strong>Error:</strong> {error}</div>}
                <div><strong>Token:</strong> {token.substring(0, 12)}...</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Helpful Suggestions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">What you can do:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRetry}
              variant="outline"
              className="flex-1"
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={goToHome}
              className="flex-1"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Support Contact */}
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <p>Still having trouble?</p>
            <p>Contact your school's administration office</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}