import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/context/SessionContext';
import { PatientProfile, Report, ExtractedData, RiskAssessment, MedicationSuggestion } from '@/types/medical';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AIChat from '@/components/shared/AIChat';
import { Activity, FileText, Brain, Pill, Shield, MessageSquare, LogOut, Loader2, AlertCircle, CheckCircle, Clock, User, Droplets } from 'lucide-react';
import { useSession as useSessionCtx } from '@/context/SessionContext';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'reports', label: 'My Reports', icon: FileText },
  { id: 'risk', label: 'Risk Assessment', icon: Shield },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
];

export default function PatientPortal() {
  const { currentUser, logout } = useSession();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [riskData, setRiskData] = useState<RiskAssessment | null>(null);
  const [medications, setMedications] = useState<MedicationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { data: profileData, error: pe } = await supabase
        .from('patient_profiles')
        .select('*')
        .ilike('full_name', currentUser.full_name)
        .single();

      if (pe || !profileData) { setError('Could not find your patient profile.'); setIsLoading(false); return; }
      setProfile(profileData as PatientProfile);

      const pid = profileData.patient_id;
      const [reps, exts, risk, meds] = await Promise.all([
        supabase.from('reports').select('*').eq('patient_id', pid).order('upload_timestamp', { ascending: false }),
        supabase.from('extracted_data').select('*').eq('patient_id', pid).order('extraction_timestamp', { ascending: false }),
        supabase.from('risk_assessments').select('*').eq('patient_id', pid).order('assessed_at', { ascending: false }).limit(1).single(),
        supabase.from('medication_suggestions').select('*').eq('patient_id', pid).order('priority', { ascending: true }),
      ]);

      setReports((reps.data || []) as Report[]);
      setExtractedData((exts.data || []) as ExtractedData[]);
      setRiskData(risk.data as RiskAssessment | null);
      setMedications((meds.data || []) as MedicationSuggestion[]);
    } catch (err) { setError('Failed to load data'); }
    finally { setIsLoading(false); }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const riskColor = (level?: string) => ({ Low: 'text-chart-1', Moderate: 'text-chart-4', High: 'text-destructive', Critical: 'text-destructive' }[level || ''] || 'text-muted-foreground');
  const statusIcon = (s: string) => s === 'validated' ? <CheckCircle className="w-3.5 h-3.5 text-chart-1" /> : s === 'mismatch' ? <AlertCircle className="w-3.5 h-3.5 text-foreground" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="font-semibold text-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">Please contact your doctor to register your account.</p>
          <Button variant="outline" onClick={logout}>Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );

  const patientData = { full_name: profile?.full_name, patient_id: profile?.patient_id, blood_type: profile?.blood_type, allergies: profile?.allergies, chronic_conditions: profile?.chronic_conditions };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10"><Activity className="w-4 h-4 text-primary" /></div>
          <div>
            <p className="text-sm font-bold text-foreground">MediCore AI</p>
            <p className="text-xs text-muted-foreground">Patient Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{currentUser?.full_name}</p>
            <p className="text-xs font-mono text-muted-foreground">{profile?.patient_id}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-5">
        {/* Profile Card */}
        <Card className="bg-gradient-to-r from-primary/5 to-card border-primary/20">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-lg shrink-0">{profile?.full_name?.charAt(0)}</div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{profile?.full_name}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile?.blood_type && <Badge variant="outline" className="text-xs"><Droplets className="w-3 h-3 mr-1" />{profile.blood_type}</Badge>}
                {profile?.gender && <Badge variant="outline" className="text-xs">{profile.gender}</Badge>}
                {riskData && <Badge className={`text-xs ${riskData.overall_risk_level === 'Low' ? 'bg-chart-1/15 text-chart-1' : 'bg-destructive/15 text-destructive'} border-none`}>{riskData.overall_risk_level} Risk</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all shrink-0 ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Reports', value: reports.length, icon: FileText },
              { label: 'Medications', value: medications.length, icon: Pill },
              { label: 'Risk Level', value: riskData?.overall_risk_level || 'N/A', icon: Shield },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="p-2 rounded-lg bg-primary/10"><item.icon className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${item.label === 'Risk Level' ? riskColor(item.value as string) : 'text-foreground'}`}>{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {profile?.chronic_conditions && profile.chronic_conditions.length > 0 && (
              <Card className="sm:col-span-3">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground mb-2">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-1.5">{profile.chronic_conditions.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}</div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? <Card className="border-dashed"><CardContent className="text-center py-12 text-muted-foreground text-sm">No reports uploaded yet</CardContent></Card> :
              reports.map(r => (
                <Card key={r.id}>
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0"><FileText className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.original_filename}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">{r.document_category}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">{statusIcon(r.ai_validation_status)}{r.ai_validation_status}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.upload_timestamp).toLocaleDateString()}</span>
                      </div>
                      {r.ai_validation_message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.ai_validation_message}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))
            }
          </div>
        )}

        {activeTab === 'risk' && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Risk Assessment</CardTitle></CardHeader>
            <CardContent>
              {!riskData ? <p className="text-sm text-muted-foreground">No risk assessment available yet</p> : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${riskColor(riskData.overall_risk_level)}`}>{riskData.overall_risk_level} Risk</span>
                    {riskData.risk_score !== undefined && <span className="text-muted-foreground text-sm">Score: {riskData.risk_score}/100</span>}
                  </div>
                  {riskData.recommendations && riskData.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Recommendations</p>
                      <ul className="space-y-1">{riskData.recommendations.map((r, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{r}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'medications' && (
          <div className="space-y-3">
            {medications.length === 0 ? <Card className="border-dashed"><CardContent className="text-center py-12 text-muted-foreground text-sm">No medication suggestions yet</CardContent></Card> :
              medications.map(med => (
                <Card key={med.id} className="border-l-4 border-l-primary">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{med.medication_name}</p>
                      <Badge variant={med.priority === 'Critical' ? 'destructive' : 'secondary'} className="text-xs shrink-0">{med.priority}</Badge>
                    </div>
                    {med.dosage && <p className="text-xs text-muted-foreground mt-1">Dosage: {med.dosage} — {med.frequency}</p>}
                    {med.indication && <p className="text-xs text-muted-foreground">For: {med.indication}</p>}
                  </CardContent>
                </Card>
              ))
            }
          </div>
        )}

        {activeTab === 'chat' && profile && (
          <Card><AIChat patientId={profile.patient_id} patientData={patientData} roleType="patient" /></Card>
        )}
      </div>
    </div>
  );
}
