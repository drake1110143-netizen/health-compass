import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MedicationSuggestion } from '@/types/medical';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface MedicationSuggestionsProps {
  patientId: string;
  patientProfileId: string;
  patientData: Record<string, unknown>;
}

export default function MedicationSuggestions({ patientId, patientProfileId, patientData }: MedicationSuggestionsProps) {
  const [medications, setMedications] = useState<MedicationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchMedications = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('medication_suggestions')
      .select('*')
      .eq('patient_id', patientId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });
    setMedications((data || []) as MedicationSuggestion[]);
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => { fetchMedications(); }, [fetchMedications]);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const { data: extractedData } = await supabase
        .from('extracted_data')
        .select('structured_data, document_category')
        .eq('patient_id', patientId)
        .order('extraction_timestamp', { ascending: false })
        .limit(10);

      const { error: fnError } = await supabase.functions.invoke('ai-medication-suggestions', {
        body: { patientId, patientProfileId, patientData, extractedData: extractedData || [] },
      });

      if (fnError) throw new Error(fnError.message);
      await fetchMedications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const priorityStyle = (p: string) => {
    const map: Record<string, string> = {
      Critical: 'border-l-destructive bg-destructive/5',
      High: 'border-l-primary bg-primary/5',
      Standard: 'border-l-border bg-card',
      Optional: 'border-l-muted bg-muted/20',
    };
    return map[p] || 'border-l-border bg-card';
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      Critical: 'bg-destructive/15 text-destructive',
      High: 'bg-primary/15 text-primary',
      Standard: 'bg-muted/50 text-muted-foreground',
      Optional: 'bg-accent text-accent-foreground',
    };
    return map[p] || 'bg-muted/50 text-muted-foreground';
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button onClick={generateSuggestions} disabled={isGenerating} size="sm">
          {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {medications.length > 0 ? 'Re-generate Suggestions' : 'Generate Suggestions'}
        </Button>
        <Button onClick={fetchMedications} disabled={isGenerating} size="sm" variant="ghost">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {medications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="p-3 rounded-full bg-muted/50">
              <Pill className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No medication suggestions generated yet</p>
            <p className="text-xs text-muted-foreground">Upload documents first, then generate suggestions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medications.map(med => (
            <div key={med.id} className={`p-4 rounded-lg border border-l-4 ${priorityStyle(med.priority)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Pill className="w-4 h-4 text-primary shrink-0" />
                  <p className="font-semibold text-foreground">{med.medication_name}</p>
                  {med.generic_name && med.generic_name !== med.medication_name && (
                    <span className="text-xs text-muted-foreground">({med.generic_name})</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityBadge(med.priority)}`}>
                  {med.priority}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {med.dosage && (
                  <div>
                    <p className="text-xs text-muted-foreground">Dosage</p>
                    <p className="text-xs font-medium text-foreground">{med.dosage}</p>
                  </div>
                )}
                {med.frequency && (
                  <div>
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="text-xs font-medium text-foreground">{med.frequency}</p>
                  </div>
                )}
                {med.route && (
                  <div>
                    <p className="text-xs text-muted-foreground">Route</p>
                    <p className="text-xs font-medium text-foreground">{med.route}</p>
                  </div>
                )}
              </div>

              {med.indication && (
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium text-foreground">Indication:</span> {med.indication}
                </p>
              )}

              {med.contraindications && med.contraindications.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  <span className="font-medium">Contraindications:</span> {med.contraindications.join(', ')}
                </p>
              )}

              {med.rule_applied && (
                <p className="text-xs text-muted-foreground mt-1 italic">Rule: {med.rule_applied}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
