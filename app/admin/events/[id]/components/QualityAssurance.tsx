'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  Eye,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface QualityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'photos' | 'data' | 'system' | 'user_experience';
  timestamp: string;
  actionRequired?: boolean;
  autoFixable?: boolean;
}

interface QualityAssuranceProps {
  eventId?: string;
  issues?: QualityIssue[];
  onRefresh?: () => void;
  onResolveIssue?: (issueId: string) => void;
  onDismissIssue?: (issueId: string) => void;
}

export function QualityAssurance({ 
  eventId, 
  issues = [],
  onRefresh,
  onResolveIssue,
  onDismissIssue 
}: QualityAssuranceProps) {
  const [loading, setLoading] = useState(false);
  const [localIssues, setLocalIssues] = useState<QualityIssue[]>(issues);

  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (issueId: string) => {
    onResolveIssue?.(issueId);
    setLocalIssues(prev => prev.filter(issue => issue.id !== issueId));
  };

  const handleDismiss = (issueId: string) => {
    onDismissIssue?.(issueId);
    setLocalIssues(prev => prev.filter(issue => issue.id !== issueId));
  };

  const getIssueIcon = (type: QualityIssue['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: QualityIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const criticalIssues = localIssues.filter(issue => issue.severity === 'critical');
  const highIssues = localIssues.filter(issue => issue.severity === 'high');
  const otherIssues = localIssues.filter(issue => !['critical', 'high'].includes(issue.severity));

  return (
    <Card className="glass-work-island">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Control de Calidad
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {localIssues.length} {localIssues.length === 1 ? 'problema' : 'problemas'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {localIssues.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-green-700">¡Excelente!</p>
            <p className="text-sm text-muted-foreground">
              No se detectaron problemas de calidad
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Critical Issues */}
            {criticalIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Problemas Críticos ({criticalIssues.length})
                </h4>
                {criticalIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onResolve={handleResolve}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}

            {/* High Priority Issues */}
            {highIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alta Prioridad ({highIssues.length})
                </h4>
                {highIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onResolve={handleResolve}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}

            {/* Other Issues */}
            {otherIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Otros ({otherIssues.length})
                </h4>
                {otherIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onResolve={handleResolve}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface IssueCardProps {
  issue: QualityIssue;
  onResolve: (issueId: string) => void;
  onDismiss: (issueId: string) => void;
}

function IssueCard({ issue, onResolve, onDismiss }: IssueCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-label-ios26 p-3 border border-gray-200 rounded-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            {issue.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
            {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            {issue.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{issue.title}</p>
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-0.5 ${getSeverityColor(issue.severity)}`}
              >
                {issue.severity}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              {issue.description}
            </p>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(issue.timestamp).toLocaleDateString()}
              </span>
              <span className="capitalize">{issue.category?.replace('_', ' ') || 'general'}</span>
              {issue.actionRequired && (
                <Badge variant="destructive" className="text-xs">
                  Acción requerida
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {issue.autoFixable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolve(issue.id)}
              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              Resolver
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(issue.id)}
            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function getSeverityColor(severity: QualityIssue['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}