'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  Calendar,
  Users,
  BarChart3,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WorkflowStatus {
  id: string;
  name: string;
  event_type: string;
  enabled: boolean;
  description: string;
  last_executed?: string;
  execution_count?: number;
  success_rate?: number;
}

interface ScheduledJobStatus {
  name: string;
  description: string;
  frequency: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  status?: 'success' | 'failed' | 'running';
}

interface WorkflowExecution {
  id: string;
  workflow_name: string;
  order_id: string;
  status: 'success' | 'failed' | 'running';
  executed_at: string;
  duration_ms?: number;
  actions_executed?: number;
  error_message?: string;
}

export default function WorkflowManagementDashboard() {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJobStatus[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load workflow data
  const loadWorkflowData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      // Load workflows
      const workflowsResponse = await fetch('/api/admin/orders/workflows?action=workflows');
      if (workflowsResponse.ok) {
        const workflowsData = await workflowsResponse.json();
        setWorkflows(workflowsData.data.workflows || []);
      }

      // Load scheduled jobs status
      const jobsResponse = await fetch('/api/admin/orders/scheduled-jobs?action=status');
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setScheduledJobs(jobsData.status.jobs_configured || []);
      }

      // Mock recent executions (in real implementation, fetch from API)
      setRecentExecutions([
        {
          id: 'exec_1',
          workflow_name: 'Order Confirmation Email',
          order_id: 'order_123',
          status: 'success',
          executed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          duration_ms: 1250,
          actions_executed: 1,
        },
        {
          id: 'exec_2',
          workflow_name: 'Payment Received Notification',
          order_id: 'order_124',
          status: 'success',
          executed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          duration_ms: 980,
          actions_executed: 1,
        },
        {
          id: 'exec_3',
          workflow_name: 'Overdue Order Reminder',
          order_id: 'order_125',
          status: 'failed',
          executed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          duration_ms: 2100,
          error_message: 'Email delivery failed',
        },
      ]);

    } catch (error) {
      console.error('Error loading workflow data:', error);
      alert('Failed to load workflow data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData]);

  // Test workflow
  const testWorkflow = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/orders/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_workflow' }),
      });

      if (response.ok) {
        alert('Test workflow executed successfully!');
        loadWorkflowData(false);
      } else {
        throw new Error('Test workflow failed');
      }
    } catch (error) {
      console.error('Error testing workflow:', error);
      alert('Failed to test workflow');
    } finally {
      setRefreshing(false);
    }
  };

  // Run scheduled jobs manually
  const runScheduledJobs = async () => {
    try {
      setRefreshing(true);
      
      // Note: In production, this would need proper authentication
      const response = await fetch('/api/admin/orders/scheduled-jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-secret' // In production, use proper auth
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Scheduled jobs completed! Processed: ${JSON.stringify(result.results)}`);
        loadWorkflowData(false);
      } else {
        throw new Error('Scheduled jobs failed');
      }
    } catch (error) {
      console.error('Error running scheduled jobs:', error);
      alert('Failed to run scheduled jobs');
    } finally {
      setRefreshing(false);
    }
  };

  // Process overdue orders
  const processOverdueOrders = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/orders/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_overdue' }),
      });

      if (response.ok) {
        alert('Overdue orders processed successfully!');
        loadWorkflowData(false);
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      console.error('Error processing overdue orders:', error);
      alert('Failed to process overdue orders');
    } finally {
      setRefreshing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading workflow dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Management</h1>
          <p className="text-muted-foreground">
            Monitor and control automated order processing workflows
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadWorkflowData()}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={testWorkflow}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Test Workflow
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <Zap className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled Jobs
          </TabsTrigger>
          <TabsTrigger value="executions" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Executions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                    <p className="text-2xl font-bold">{workflows.filter(w => w.enabled).length}</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recent Executions</p>
                    <p className="text-2xl font-bold">{recentExecutions.length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {recentExecutions.length > 0 
                        ? Math.round((recentExecutions.filter(e => e.status === 'success').length / recentExecutions.length) * 100)
                        : 0}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Scheduled Jobs</p>
                    <p className="text-2xl font-bold">{scheduledJobs.filter(j => j.enabled).length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={processOverdueOrders}
                  disabled={refreshing}
                  className="justify-start gap-2 h-auto p-4 flex-col items-start"
                  variant="outline"
                >
                  <div className="flex items-center gap-2 w-full">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium">Process Overdue Orders</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Check for pending orders older than 24 hours and send reminders
                  </p>
                </Button>

                <Button
                  onClick={runScheduledJobs}
                  disabled={refreshing}
                  className="justify-start gap-2 h-auto p-4 flex-col items-start"
                  variant="outline"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Run Scheduled Jobs</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Manually trigger all scheduled automation jobs
                  </p>
                </Button>

                <Button
                  onClick={testWorkflow}
                  disabled={refreshing}
                  className="justify-start gap-2 h-auto p-4 flex-col items-start"
                  variant="outline"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Play className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Test Workflows</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Run a test workflow with sample data to verify functionality
                  </p>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Workflow Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentExecutions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        execution.status === 'success' ? 'bg-green-100' :
                        execution.status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {execution.status === 'success' ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> :
                          execution.status === 'failed' ?
                          <AlertTriangle className="h-4 w-4 text-red-600" /> :
                          <Clock className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">{execution.workflow_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Order: {execution.order_id} • {formatTimeAgo(execution.executed_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(execution.status)}
                      {execution.duration_ms && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {execution.duration_ms}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Active Workflows
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Workflow
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${workflow.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {workflow.event_type === 'order_created' ? <Plus className="h-4 w-4" /> :
                         workflow.event_type === 'status_changed' ? <ArrowRight className="h-4 w-4" /> :
                         workflow.event_type === 'overdue_order' ? <Clock className="h-4 w-4" /> :
                         <Mail className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-medium">{workflow.name}</h3>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {workflow.event_type.replace('_', ' ')}
                          </Badge>
                          {workflow.enabled ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        {workflow.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Jobs Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledJobs.map((job, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${job.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {job.frequency}
                          </Badge>
                          {job.enabled ? (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Enabled</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 text-xs">Disabled</Badge>
                          )}
                        </div>
                        {job.next_run && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Next run: {new Date(job.next_run).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Workflow Execution History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExecutions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        execution.status === 'success' ? 'bg-green-100' :
                        execution.status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {execution.status === 'success' ? 
                          <CheckCircle className="h-4 w-4 text-green-600" /> :
                          execution.status === 'failed' ?
                          <AlertTriangle className="h-4 w-4 text-red-600" /> :
                          <Clock className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div>
                        <h3 className="font-medium">{execution.workflow_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Order: {execution.order_id} • {new Date(execution.executed_at).toLocaleString()}
                        </p>
                        {execution.error_message && (
                          <p className="text-sm text-red-600 mt-1">{execution.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(execution.status)}
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        {execution.duration_ms && <div>Duration: {execution.duration_ms}ms</div>}
                        {execution.actions_executed && <div>Actions: {execution.actions_executed}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}