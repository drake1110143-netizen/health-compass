import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MLPrediction, RiskAssessment, Procedure } from '@/types/medical';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, TrendingUp, Loader2, RefreshCw, Activity, Shield, Zap } from 'lucide-react';

interface MLAnalysisProps {
  patientId: string;
  patientProfileId: string;
  patientData: Record<string, unknown>;
}

export default function MLAnalysis({ patientId, patientProfileId, patientData }: MLAnalysisProps) {
  const [riskData, setRiskData] = useState<RiskAssessment | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [riskRes, procRes, predRes] = await Promise.all([
      supabase.from('risk_assessments').select('*').eq('patient_id', patientId).order('assessed_at', { ascending: false }).limit(1).single(),
      supabase.from('procedures').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('ml_predictions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(5),
    ]);
    setRiskData(riskRes.data as RiskAssessment | null);
    setProcedures((procRes.data || []) as Procedure[]);
    setPredictions((predRes.data || []) as MLPrediction[]);
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runAnalysis = async (type: 'risk' | 'procedure') => {
    setIsAnalyzing(true);
    setError('');
    try {
      // Get extracted data for this patient
      const { data: extractedData } = await supabase
        .from('extracted_data')
        .select('structured_data, document_category, extraction_timestamp')
        .eq('patient_id', patientId)
        .order('extraction_timestamp', { ascending: false })
        .limit(10);

      const { error: fnError } = await supabase.functions.invoke('ml-analyze', {
        body: {
          patientId,
          patientProfileId,
          analysisType: type,
          patientData,
          extractedData: extractedData || [],
        },
      });

      if (fnError) throw new Error(fnError.message);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const riskColor = (level?: string) => {
    if (!level) return 'bg-muted text-muted-foreground';
    const map: Record<string, string> = {
      Low: 'bg-chart-1/15 text-chart-1 border-chart-1/30',
      Moderate: 'bg-chart-4/15 text-chart-4 border-chart-4/30',
      High: 'bg-destructive/15 text-destructive border-destructive/30',
      Critical: 'bg-destructive/25 text-destructive border-destructive/50',
    };
    return map[level] || 'bg-muted text-muted-foreground';
  };

  const priorityColor = (priority?: string) => {
    const map: Record<string, string> = {
      Urgent: 'bg-destructive/15 text-destructive',
      High: 'bg-chart-2/15 text-primary',
      Medium: 'bg-chart-4/15 text-chart-4',
      Low: 'bg-muted/50 text-muted-foreground',
      Routine: 'bg-accent text-accent-foreground',
    };
    return map[priority || ''] || 'bg-muted/50 text-muted-foreground';
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runAnalysis('risk')} disabled={isAnalyzing} size="sm">
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
          Run Risk Assessment
        </Button>
        <Button onClick={() => runAnalysis('procedure')} disabled={isAnalyzing} size="sm" variant="outline">
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
          Generate Procedures
        </Button>
        <Button onClick={fetchData} disabled={isAnalyzing} size="sm" variant="ghost">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {/* Risk Assessment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!riskData ? (
            <p className="text-sm text-muted-foreground">No risk assessment available. Run analysis to generate.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${riskColor(riskData.overall_risk_level)}`}>
                  {riskData.overall_risk_level} Risk
                </span>
                {riskData.risk_score !== undefined && (
                  <span className="text-sm text-muted-foreground">Score: {riskData.risk_score}/100</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(riskData.assessed_at).toLocaleDateString()}
                </span>
              </div>

              {/* Sub-risks */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Cardiovascular', value: riskData.cardiovascular_risk },
                  { label: 'Metabolic', value: riskData.metabolic_risk },
                  { label: 'Respiratory', value: riskData.respiratory_risk },
                  { label: 'Neurological', value: riskData.neurological_risk },
                ].map(item => item.value && (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${riskColor(item.value)}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {riskData.recommendations && riskData.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Recommendations</p>
                  <ul className="space-y-1">
                    {riskData.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>{rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Procedures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Recommended Procedures ({procedures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {procedures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No procedures generated yet. Run procedure analysis.</p>
          ) : (
            <div className="space-y-3">
              {procedures.map(proc => (
                <div key={proc.id} className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{proc.procedure_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(proc.priority)}`}>
                      {proc.priority}
                    </span>
                  </div>
                  {proc.rationale && (
                    <p className="text-xs text-muted-foreground">{proc.rationale}</p>
                  )}
                  {proc.procedure_code && (
                    <p className="text-xs font-mono text-muted-foreground">Code: {proc.procedure_code}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Info */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              ML Model Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {predictions.slice(0, 3).map(pred => (
                <div key={pred.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{pred.prediction_type} ({pred.prediction_category})</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{pred.model_version}</Badge>
                    {pred.confidence_score && (
                      <span className="text-muted-foreground">{Math.round(pred.confidence_score * 100)}% conf.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
