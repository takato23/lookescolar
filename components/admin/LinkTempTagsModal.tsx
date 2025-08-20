'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Link2, 
  Users, 
  Tag,
  ArrowRight,
  Check,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface TempTag {
  id: string;
  photo_id: string;
  temp_name: string;
  temp_email?: string;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  email?: string;
  grade_section?: string;
}

interface LinkingRule {
  tempName: string;
  tempEmail?: string;
  studentId: string;
  studentName: string;
  confidence: 'high' | 'medium' | 'low';
}

interface LinkTempTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName?: string;
  onLinked?: () => void;
}

export function LinkTempTagsModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  onLinked
}: LinkTempTagsModalProps) {
  const [tempTags, setTempTags] = useState<TempTag[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [suggestedRules, setSuggestedRules] = useState<LinkingRule[]>([]);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  // Load temp tags and students when modal opens
  useEffect(() => {
    if (isOpen && eventId) {
      loadData();
    }
  }, [isOpen, eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tempTagsResponse, studentsResponse] = await Promise.all([
        fetch(`/api/admin/temp-tags?eventId=${eventId}`),
        fetch(`/api/admin/subjects?event_id=${eventId}`)
      ]);

      const [tempTagsData, studentsData] = await Promise.all([
        tempTagsResponse.json(),
        studentsResponse.json()
      ]);

      const fetchedTempTags = tempTagsData.tempTags || [];
      const fetchedStudents = studentsData.subjects || [];

      setTempTags(fetchedTempTags);
      setStudents(fetchedStudents);

      // Generate suggested linking rules
      const suggestions = generateLinkingSuggestions(fetchedTempTags, fetchedStudents);
      setSuggestedRules(suggestions);
      
      // Auto-select high confidence suggestions
      const highConfidenceKeys = suggestions
        .filter(rule => rule.confidence === 'high')
        .map(rule => `${rule.tempName}:${rule.studentId}`);
      setSelectedRules(new Set(highConfidenceKeys));

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const generateLinkingSuggestions = (tempTags: TempTag[], students: Student[]): LinkingRule[] => {
    const suggestions: LinkingRule[] = [];
    const uniqueTempNames = [...new Set(tempTags.map(tag => tag.temp_name))];

    for (const tempName of uniqueTempNames) {
      const tempTag = tempTags.find(tag => tag.temp_name === tempName);
      if (!tempTag) continue;

      // Find matching students by name similarity
      const matches = students.map(student => {
        const nameScore = calculateNameSimilarity(tempName, student.name);
        const emailScore = tempTag.temp_email && student.email 
          ? calculateEmailSimilarity(tempTag.temp_email, student.email)
          : 0;
        
        const totalScore = Math.max(nameScore, emailScore);
        let confidence: 'high' | 'medium' | 'low' = 'low';
        
        if (totalScore >= 0.9) confidence = 'high';
        else if (totalScore >= 0.7) confidence = 'medium';

        return {
          student,
          score: totalScore,
          confidence
        };
      }).filter(match => match.score >= 0.6)
        .sort((a, b) => b.score - a.score);

      // Take the best match
      if (matches.length > 0) {
        const bestMatch = matches[0];
        suggestions.push({
          tempName,
          tempEmail: tempTag.temp_email,
          studentId: bestMatch.student.id,
          studentName: bestMatch.student.name,
          confidence: bestMatch.confidence
        });
      }
    }

    return suggestions;
  };

  const calculateNameSimilarity = (name1: string, name2: string): number => {
    const clean1 = name1.toLowerCase().trim();
    const clean2 = name2.toLowerCase().trim();

    // Exact match
    if (clean1 === clean2) return 1.0;

    // Check if one contains the other
    if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.85;

    // Simple word overlap
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    
    if (intersection.length === 0) return 0;
    
    return intersection.length / Math.max(words1.length, words2.length);
  };

  const calculateEmailSimilarity = (email1: string, email2: string): number => {
    const clean1 = email1.toLowerCase().trim();
    const clean2 = email2.toLowerCase().trim();
    return clean1 === clean2 ? 1.0 : 0;
  };

  const toggleRule = (rule: LinkingRule) => {
    const key = `${rule.tempName}:${rule.studentId}`;
    const newSelected = new Set(selectedRules);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedRules(newSelected);
  };

  const handleLink = async () => {
    const rulesToLink = suggestedRules.filter(rule => 
      selectedRules.has(`${rule.tempName}:${rule.studentId}`)
    );

    if (rulesToLink.length === 0) {
      toast.error('Selecciona al menos una vinculación');
      return;
    }

    setLinking(true);
    try {
      const response = await fetch('/api/admin/temp-tags/link-to-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          linkingRules: rulesToLink
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error linking temporary tags');
      }

      const { results, successfulLinks, failedLinks } = data;

      toast.success(
        `✅ ${successfulLinks} vinculaciones exitosas${failedLinks > 0 ? `, ${failedLinks} fallidas` : ''}`,
        {
          description: `Se vincularon ${results.reduce((acc: number, r: any) => acc + r.linkedPhotosCount, 0)} fotos`
        }
      );

      onLinked?.();
      onClose();

    } catch (error) {
      console.error('Error linking temp tags:', error);
      toast.error(error instanceof Error ? error.message : 'Error al vincular etiquetas');
    } finally {
      setLinking(false);
    }
  };

  const getConfidenceColor = (confidence: LinkingRule['confidence']) => {
    switch (confidence) {
      case 'high': return 'bg-green-50 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getConfidenceIcon = (confidence: LinkingRule['confidence']) => {
    switch (confidence) {
      case 'high': return <Check className="w-3 h-3" />;
      case 'medium': return <AlertTriangle className="w-3 h-3" />;
      case 'low': return <X className="w-3 h-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Vincular Etiquetas Temporales
          </DialogTitle>
          {eventName && (
            <p className="text-sm text-muted-foreground">
              Evento: {eventName}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando datos...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Tag className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                  <div className="font-semibold">{tempTags.length}</div>
                  <div className="text-xs text-muted-foreground">Etiquetas temporales</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="font-semibold">{students.length}</div>
                  <div className="text-xs text-muted-foreground">Estudiantes oficiales</div>
                </CardContent>
              </Card>
            </div>

            {/* Suggestions */}
            {suggestedRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No se encontraron coincidencias automáticas</p>
                <p className="text-xs">Verifica que los nombres sean similares</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Vinculaciones Sugeridas ({suggestedRules.length})
                </h4>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {suggestedRules.map((rule, index) => {
                    const key = `${rule.tempName}:${rule.studentId}`;
                    const isSelected = selectedRules.has(key);
                    
                    return (
                      <Card 
                        key={index}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleRule(rule)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {rule.tempName}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium text-sm text-blue-700">
                                    {rule.studentName}
                                  </span>
                                </div>
                                {rule.tempEmail && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {rule.tempEmail}
                                  </div>
                                )}
                              </div>
                              
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getConfidenceColor(rule.confidence)}`}
                              >
                                {getConfidenceIcon(rule.confidence)}
                                <span className="ml-1 capitalize">{rule.confidence}</span>
                              </Badge>
                            </div>
                            
                            <div className="ml-3">
                              {isSelected ? (
                                <Check className="w-4 h-4 text-blue-600" />
                              ) : (
                                <div className="w-4 h-4 rounded border-2 border-gray-300" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleLink}
                disabled={selectedRules.size === 0 || linking}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {linking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Vincular ({selectedRules.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

