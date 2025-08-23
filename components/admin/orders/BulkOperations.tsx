'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  Loader2,
  AlertTriangle,
  Settings,
  Calendar,
  Truck,
  FileText,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { OrderStatus } from '@/lib/services/enhanced-order.service';
import type { ExportTemplate, ExportFormat } from '@/lib/services/order-export.service';

interface BulkOperationsProps {
  selectedOrderIds: string[];
  onClearSelection: () => void;
  onOperationComplete: () => void;
  className?: string;
}

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'secondary';
  requiresConfirmation: boolean;
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'mark-delivered',
    name: 'Mark as Delivered',
    description: 'Mark selected orders as delivered',
    icon: <CheckCircle className=\"h-4 w-4\" />,
    variant: 'default',
    requiresConfirmation: true,
  },
  {
    id: 'cancel-orders',
    name: 'Cancel Orders',
    description: 'Cancel selected orders',
    icon: <XCircle className=\"h-4 w-4\" />,
    variant: 'destructive',
    requiresConfirmation: true,
  },
  {
    id: 'update-priority',
    name: 'Update Priority',
    description: 'Change priority level for selected orders',
    icon: <AlertTriangle className=\"h-4 w-4\" />,
    variant: 'secondary',
    requiresConfirmation: false,
  },
  {
    id: 'set-delivery-method',
    name: 'Set Delivery Method',
    description: 'Set delivery method for selected orders',
    icon: <Truck className=\"h-4 w-4\" />,
    variant: 'secondary',
    requiresConfirmation: false,
  },
  {
    id: 'export-orders',
    name: 'Export Orders',
    description: 'Export selected orders to file',
    icon: <Download className=\"h-4 w-4\" />,
    variant: 'secondary',
    requiresConfirmation: false,
  },
  {
    id: 'generate-labels',
    name: 'Generate Labels',
    description: 'Generate shipping labels for selected orders',
    icon: <Printer className=\"h-4 w-4\" />,
    variant: 'secondary',
    requiresConfirmation: false,
  },
];

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
  { value: 'json', label: 'JSON' },
];

const EXPORT_TEMPLATES: { value: ExportTemplate; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Basic order information' },
  { value: 'detailed', label: 'Detailed', description: 'Complete order details with audit trail' },
  { value: 'summary', label: 'Summary', description: 'Condensed order summary' },
  { value: 'financial', label: 'Financial', description: 'Financial and payment information' },
  { value: 'labels', label: 'Labels', description: 'Shipping label format' },
];

const PRIORITY_LEVELS = [
  { value: 1, label: 'Low (1)' },
  { value: 2, label: 'Normal (2)' },
  { value: 3, label: 'Medium (3)' },
  { value: 4, label: 'High (4)' },
  { value: 5, label: 'Critical (5)' },
];

const DELIVERY_METHODS = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'email', label: 'Email' },
  { value: 'postal', label: 'Postal' },
  { value: 'hand_delivery', label: 'Hand Delivery' },
];

export default function BulkOperations({
  selectedOrderIds,
  onClearSelection,
  onOperationComplete,
  className,
}: BulkOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  
  // Operation-specific state
  const [adminNotes, setAdminNotes] = useState('');
  const [newPriority, setNewPriority] = useState<number>(2);
  const [newDeliveryMethod, setNewDeliveryMethod] = useState<string>('pickup');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportTemplate, setExportTemplate] = useState<ExportTemplate>('standard');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  if (selectedOrderIds.length === 0) {
    return null;
  }

  const executeOperation = async (operation: BulkOperation) => {
    setLoading(true);
    setCurrentOperation(operation.id);
    setProgress(0);

    try {
      let result;
      
      switch (operation.id) {
        case 'mark-delivered':
          result = await executeBulkStatusUpdate('delivered');
          break;
        case 'cancel-orders':
          result = await executeBulkStatusUpdate('cancelled');
          break;
        case 'update-priority':
          result = await executeBulkPriorityUpdate();
          break;
        case 'set-delivery-method':
          result = await executeBulkDeliveryMethodUpdate();
          break;
        case 'export-orders':
          result = await executeExportOrders();
          break;
        case 'generate-labels':
          result = await executeGenerateLabels();
          break;
        default:
          throw new Error(`Unknown operation: ${operation.id}`);
      }

      toast({
        title: \"Operation Completed\",
        description: `${operation.name} completed successfully for ${result.successCount || selectedOrderIds.length} orders`,
      });

      onOperationComplete();
      setShowOperationDialog(false);
      
      if (operation.id !== 'export-orders' && operation.id !== 'generate-labels') {
        onClearSelection();
      }

    } catch (error) {
      console.error(`Bulk operation ${operation.id} failed:`, error);
      toast({
        title: \"Operation Failed\",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: \"destructive\",
      });
    } finally {
      setLoading(false);
      setCurrentOperation(null);
      setProgress(0);
    }
  };

  const executeBulkStatusUpdate = async (status: OrderStatus) => {
    const response = await fetch('/api/admin/orders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_ids: selectedOrderIds,
        updates: {
          status,
          admin_notes: adminNotes || `Bulk ${status} operation`,
          ...(estimatedDeliveryDate && { estimated_delivery_date: estimatedDeliveryDate }),
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update orders');
    }

    const result = await response.json();
    return { successCount: result.result.successful_updates };
  };

  const executeBulkPriorityUpdate = async () => {
    const response = await fetch('/api/admin/orders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_ids: selectedOrderIds,
        updates: {
          priority_level: newPriority,
          admin_notes: adminNotes || `Priority updated to ${newPriority}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update priority');
    }

    const result = await response.json();
    return { successCount: result.result.successful_updates };
  };

  const executeBulkDeliveryMethodUpdate = async () => {
    const response = await fetch('/api/admin/orders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_ids: selectedOrderIds,
        updates: {
          delivery_method: newDeliveryMethod,
          admin_notes: adminNotes || `Delivery method set to ${newDeliveryMethod}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update delivery method');
    }

    const result = await response.json();
    return { successCount: result.result.successful_updates };
  };

  const executeExportOrders = async () => {
    const response = await fetch('/api/admin/orders/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: exportFormat,
        template: exportTemplate,
        filters: {
          order_ids: selectedOrderIds,
        },
        includeItems: exportTemplate === 'detailed',
        includeAuditTrail: exportTemplate === 'detailed',
        includePaymentInfo: exportTemplate === 'financial' || exportTemplate === 'detailed',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to export orders');
    }

    const result = await response.json();
    
    // In a real implementation, trigger file download
    toast({
      title: \"Export Ready\",
      description: `Exported ${result.export.recordCount} orders to ${result.export.filename}`,
    });

    return { successCount: result.export.recordCount };
  };

  const executeGenerateLabels = async () => {
    const response = await fetch('/api/admin/orders/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_ids: selectedOrderIds,
        format: 'pdf',
        label_size: 'standard',
        include_qr: true,
        include_logo: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate labels');
    }

    const result = await response.json();
    
    // In a real implementation, trigger file download
    toast({
      title: \"Labels Generated\",
      description: `Generated labels for ${result.labels.recordCount} orders`,
    });

    return { successCount: result.labels.recordCount };
  };

  const openOperationDialog = (operation: BulkOperation) => {
    setSelectedOperation(operation);
    setAdminNotes('');
    setShowOperationDialog(true);
  };

  const renderOperationForm = () => {
    if (!selectedOperation) return null;

    switch (selectedOperation.id) {
      case 'mark-delivered':
      case 'cancel-orders':
        return (
          <div className=\"space-y-4\">
            <div>
              <Label htmlFor=\"admin-notes\">Admin Notes</Label>
              <Textarea
                id=\"admin-notes\"
                placeholder=\"Add notes about this operation...\"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className=\"mt-1\"
              />
            </div>
            {selectedOperation.id === 'mark-delivered' && (
              <div>
                <Label htmlFor=\"delivery-date\">Delivery Date (optional)</Label>
                <Input
                  id=\"delivery-date\"
                  type=\"datetime-local\"
                  value={estimatedDeliveryDate}
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  className=\"mt-1\"
                />
              </div>
            )}
          </div>
        );

      case 'update-priority':
        return (
          <div className=\"space-y-4\">
            <div>
              <Label htmlFor=\"priority-level\">New Priority Level</Label>
              <Select value={newPriority.toString()} onValueChange={(value) => setNewPriority(Number(value))}>
                <SelectTrigger className=\"mt-1\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor=\"priority-notes\">Notes</Label>
              <Textarea
                id=\"priority-notes\"
                placeholder=\"Reason for priority change...\"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className=\"mt-1\"
              />
            </div>
          </div>
        );

      case 'set-delivery-method':
        return (
          <div className=\"space-y-4\">
            <div>
              <Label htmlFor=\"delivery-method\">Delivery Method</Label>
              <Select value={newDeliveryMethod} onValueChange={setNewDeliveryMethod}>
                <SelectTrigger className=\"mt-1\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor=\"delivery-notes\">Notes</Label>
              <Textarea
                id=\"delivery-notes\"
                placeholder=\"Additional delivery instructions...\"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className=\"mt-1\"
              />
            </div>
          </div>
        );

      case 'export-orders':
        return (
          <div className=\"space-y-4\">
            <div>
              <Label htmlFor=\"export-format\">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                <SelectTrigger className=\"mt-1\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor=\"export-template\">Template</Label>
              <Select value={exportTemplate} onValueChange={(value: ExportTemplate) => setExportTemplate(value)}>
                <SelectTrigger className=\"mt-1\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_TEMPLATES.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      <div>
                        <div className=\"font-medium\">{template.label}</div>
                        <div className=\"text-sm text-muted-foreground\">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Card className={className}>
        <CardContent className=\"p-4\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-3\">
              <Badge variant=\"secondary\" className=\"gap-1\">
                <Package className=\"h-3 w-3\" />
                {selectedOrderIds.length} selected
              </Badge>
              {currentOperation && (
                <div className=\"flex items-center gap-2\">
                  <Loader2 className=\"h-4 w-4 animate-spin\" />
                  <span className=\"text-sm text-muted-foreground\">Processing...</span>
                  <Progress value={progress} className=\"w-32\" />
                </div>
              )}
            </div>
            
            <div className=\"flex items-center gap-2\">
              <div className=\"flex flex-wrap gap-1\">
                {BULK_OPERATIONS.map((operation) => (
                  <Button
                    key={operation.id}
                    variant={operation.variant}
                    size=\"sm\"
                    disabled={loading}
                    onClick={() => {
                      if (operation.requiresConfirmation) {
                        openOperationDialog(operation);
                      } else {
                        openOperationDialog(operation);
                      }
                    }}
                    className=\"gap-1\"
                  >
                    {loading && currentOperation === operation.id ? (
                      <Loader2 className=\"h-3 w-3 animate-spin\" />
                    ) : (
                      operation.icon
                    )}
                    {operation.name}
                  </Button>
                ))}
              </div>
              
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={onClearSelection}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operation Dialog */}
      <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className=\"flex items-center gap-2\">
              {selectedOperation?.icon}
              {selectedOperation?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedOperation?.description} for {selectedOrderIds.length} selected orders.
            </DialogDescription>
          </DialogHeader>
          
          {renderOperationForm()}
          
          <DialogFooter>
            <Button
              variant=\"outline\"
              onClick={() => setShowOperationDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={selectedOperation?.variant || 'default'}
              onClick={() => selectedOperation && executeOperation(selectedOperation)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
                  Processing...
                </>
              ) : (
                `Confirm ${selectedOperation?.name}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}