'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Camera
} from 'lucide-react';

interface ABTestMetrics {
  qrMethod: {
    totalStudents: number;
    photosWithQR: number;
    autoClassified: number;
    avgTimePerPhoto: number; // seconds
    errorRate: number; // percentage
    successRate: number; // percentage
    coverage: number; // percentage of students with QR codes
  };
  traditionalMethod: {
    totalStudents: number;
    manuallyTagged: number;
    avgTimePerPhoto: number; // seconds
    errorRate: number; // percentage
    successRate: number; // percentage
    coverage: number; // percentage using traditional method
  };
  comparison: {
    timeImprovement: number; // percentage
    errorReduction: number; // percentage
    efficiencyGain: number; // percentage
    confidenceInterval: number; // percentage
    statisticalSignificance: boolean;
  };
}

interface EventTestData {
  eventId: string;
  eventName: string;
  startDate: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  testType: 'parallel' | 'sequential' | 'control';
  participantCount: number;
  metrics: ABTestMetrics;
}

interface ABTestingDashboardProps {
  eventId?: string;
  className?: string;
}

export default function ABTestingDashboard({ eventId, className }: ABTestingDashboardProps) {
  const [testData, setTestData] = useState<EventTestData | null>(null);
  const [allTests, setAllTests] = useState<EventTestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [testConfig, setTestConfig] = useState({
    qrParticipation: 70, // percentage of students using QR method
    traditionalParticipation: 30,
  });

  useEffect(() => {
    loadTestData();
  }, [eventId, selectedPeriod]);

  const loadTestData = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in production this would come from analytics
      const mockTestData: EventTestData = {
        eventId: eventId || 'test-event',
        eventName: 'Secondary School Spring Photos 2024',
        startDate: '2024-01-15',
        status: 'active',
        testType: 'parallel',
        participantCount: 150,
        metrics: {
          qrMethod: {
            totalStudents: 105, // 70% of 150
            photosWithQR: 892,
            autoClassified: 846,
            avgTimePerPhoto: 2.3,
            errorRate: 5.2,
            successRate: 94.8,
            coverage: 70,
          },
          traditionalMethod: {
            totalStudents: 45, // 30% of 150
            manuallyTagged: 387,
            avgTimePerPhoto: 45.6,
            errorRate: 12.1,
            successRate: 87.9,
            coverage: 30,
          },
          comparison: {
            timeImprovement: 94.9, // (45.6 - 2.3) / 45.6 * 100
            errorReduction: 57.0, // (12.1 - 5.2) / 12.1 * 100
            efficiencyGain: 1883, // 45.6 / 2.3 * 100 - 100
            confidenceInterval: 95,
            statisticalSignificance: true,
          },
        },
      };

      setTestData(mockTestData);
      setAllTests([mockTestData]);
    } catch (error) {
      toast.error('Failed to load A/B testing data');
      console.error('A/B testing load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewTest = async () => {
    try {
      toast.info('A/B test configuration feature coming soon');
      // TODO: Implement test configuration
    } catch (error) {
      toast.error('Failed to start A/B test');
    }
  };

  const stopTest = async () => {
    try {
      toast.info('Test stopping feature coming soon');
      // TODO: Implement test stopping
    } catch (error) {
      toast.error('Failed to stop test');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!testData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">No A/B testing data available</p>
          <Button onClick={startNewTest} className="mt-4">
            Start New A/B Test
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { metrics } = testData;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing Dashboard</h2>
          <p className="text-muted-foreground">
            QR Code vs Traditional Photo Classification
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={testData.status === 'active' ? 'destructive' : 'default'}
            onClick={testData.status === 'active' ? stopTest : startNewTest}
          >
            {testData.status === 'active' ? 'Stop Test' : 'Start New Test'}
          </Button>
        </div>
      </div>

      {/* Test Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Test Overview: {testData.eventName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge 
                variant={testData.status === 'active' ? 'default' : testData.status === 'completed' ? 'secondary' : 'outline'}
                className="mb-2"
              >
                {testData.status.toUpperCase()}
              </Badge>
              <p className="text-sm text-muted-foreground">Test Status</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{testData.participantCount}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{testConfig.qrParticipation}%</p>
              <p className="text-sm text-muted-foreground">Using QR Method</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Math.round(metrics.comparison.confidenceInterval)}%
              </p>
              <p className="text-sm text-muted-foreground">Confidence Interval</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Time Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">QR Method:</span>
                <Badge variant="secondary">{metrics.qrMethod.avgTimePerPhoto}s</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Traditional:</span>
                <Badge variant="outline">{metrics.traditionalMethod.avgTimePerPhoto}s</Badge>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {Math.round(metrics.comparison.timeImprovement)}%
                </p>
                <p className="text-sm text-green-600">Faster</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Accuracy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">QR Method:</span>
                <Badge variant="secondary">{metrics.qrMethod.successRate}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Traditional:</span>
                <Badge variant="outline">{metrics.traditionalMethod.successRate}%</Badge>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {Math.round(metrics.comparison.errorReduction)}%
                </p>
                <p className="text-sm text-blue-600">Error Reduction</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-purple-700 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Overall Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">QR Photos/Hour:</span>
                <Badge variant="secondary">
                  {Math.round(3600 / metrics.qrMethod.avgTimePerPhoto)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Traditional Photos/Hour:</span>
                <Badge variant="outline">
                  {Math.round(3600 / metrics.traditionalMethod.avgTimePerPhoto)}
                </Badge>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">
                  {Math.round(metrics.comparison.efficiencyGain / 100)}x
                </p>
                <p className="text-sm text-purple-600">More Efficient</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="detailed" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="detailed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Method Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">QR Code Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{metrics.qrMethod.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Photos with QR</p>
                    <p className="text-2xl font-bold">{metrics.qrMethod.photosWithQR}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-classified</p>
                    <p className="text-2xl font-bold">{metrics.qrMethod.autoClassified}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">{metrics.qrMethod.successRate}%</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Classification Rate</span>
                    <span className="text-sm font-medium">
                      {Math.round((metrics.qrMethod.autoClassified / metrics.qrMethod.photosWithQR) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.qrMethod.autoClassified / metrics.qrMethod.photosWithQR) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Traditional Method Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-700">Traditional Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{metrics.traditionalMethod.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Photos Tagged</p>
                    <p className="text-2xl font-bold">{metrics.traditionalMethod.manuallyTagged}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Time/Photo</p>
                    <p className="text-2xl font-bold">{metrics.traditionalMethod.avgTimePerPhoto}s</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">{metrics.traditionalMethod.successRate}%</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Manual Accuracy</span>
                    <span className="text-sm font-medium">
                      {metrics.traditionalMethod.successRate}%
                    </span>
                  </div>
                  <Progress 
                    value={metrics.traditionalMethod.successRate} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900">Timeline visualization coming soon</p>
                  <p className="text-sm text-blue-700">
                    This will show metrics over time, adoption rates, and key milestones.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Key Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Significant Time Savings</p>
                    <p className="text-sm text-muted-foreground">
                      QR method is {Math.round(metrics.comparison.timeImprovement)}% faster per photo
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Improved Accuracy</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(metrics.comparison.errorReduction)}% reduction in classification errors
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">High Adoption</p>
                    <p className="text-sm text-muted-foreground">
                      {testConfig.qrParticipation}% of students successfully using QR codes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-700">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Scale QR Implementation</p>
                    <p className="text-sm text-muted-foreground">
                      Results justify full QR rollout for secondary schools
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Improve QR Visibility</p>
                    <p className="text-sm text-muted-foreground">
                      Enhance QR code positioning guidelines for photographers
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Train Staff</p>
                    <p className="text-sm text-muted-foreground">
                      Provide QR-focused training for photo session staff
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics.comparison.statisticalSignificance && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Statistically Significant Results:</strong> The improvement shown by the QR method 
                is statistically significant with {metrics.comparison.confidenceInterval}% confidence. 
                These results provide strong evidence for adopting the QR code approach.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>QR Method Participation</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm w-8">{testConfig.qrParticipation}%</span>
                    <Progress value={testConfig.qrParticipation} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Traditional Method Participation</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm w-8">{testConfig.traditionalParticipation}%</span>
                    <Progress value={testConfig.traditionalParticipation} className="flex-1" />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="font-semibold text-yellow-900">Configuration Options</p>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• Adjust participant split between methods</li>
                  <li>• Set test duration and monitoring periods</li>
                  <li>• Configure success metrics and thresholds</li>
                  <li>• Enable/disable automatic test termination</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}