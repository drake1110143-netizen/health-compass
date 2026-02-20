import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PatientProfile, ExtractedData } from '@/types/medical';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Calendar, Droplets, Phone, Mail, FileText, Brain, Pill, Shield, MessageSquare, Activity, Edit3, Loader2, Copy, Check } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import MLAnalysis from './MLAnalysis';
import MedicationSuggestions from './MedicationSuggestions';
import AIChat from '@/components/shared/AIChat';

interface PatientProfileViewProps {
  patient: PatientProfile;
  onBack: () => void;
}

const TABS = [
  { id: 'info', label: 'Patient Info', icon: User },
  { id: 'records', label: 'View Records', icon: FileText },
  { id: 'upload', label: 'Upload Docs', icon: Activity },
  { id: 'ml', label: 'AI Analysis', icon: Brain },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
];

export default function PatientProfileView({ patient, onBack }: PatientProfileViewProps) {
  const { currentUser } = useSession();
  const [activeTab, setActiveTab] = useState('info');
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const patientData = {
    full_name: patient.full_name,
    patient_id: patient.patient_id,
    date_of_birth: patient.date_of_birth,
    gender: patient.gender,
    blood_type: patient.blood_type,
    allergies: patient.allergies,
    chronic_conditions: patient.chronic_conditions,
    notes: patient.notes,
  };

  const fetchRecords = useCallback(async () => {
    if (activeTab !== 'records') return;
    setIsLoadingRecords(true);
    const { data } = await supabase
      .from('extracted_data')
      .select('*')
      .eq('patient_id', patient.patient_id)
      .order('extraction_timestamp', { ascending: false });
    setExtractedData((data || []) as ExtractedData[]);
    setIsLoadingRecords(false);
  }, [patient.patient_id, activeTab]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const copyId = async () => {
    await navigator.clipboard.writeText(patient.patient_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 mt-0.5">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
              {patient.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{patient.full_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={copyId}
                  className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-2 py-0.5 rounded"
                >
                  {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {patient.patient_id}
                </button>
                {patient.gender && <Badge variant="outline" className="text-xs">{patient.gender}</Badge>}
                {patient.blood_type && <Badge variant="outline" className="text-xs"><Droplets className="w-3 h-3 mr-1" />{patient.blood_type}</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all duration-150 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Calendar, label: 'Date of Birth', value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—' },
              { icon: User, label: 'Gender', value: patient.gender || '—' },
              { icon: Droplets, label: 'Blood Type', value: patient.blood_type || '—' },
              { icon: Phone, label: 'Phone', value: patient.phone || '—' },
              { icon: Mail, label: 'Email', value: patient.email || '—' },
              { icon: Shield, label: 'Emergency', value: patient.emergency_contact || '—' },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <item.icon className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {patient.allergies && patient.allergies.length > 0 && (
              <Card className="sm:col-span-2">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map(a => (
                      <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
              <Card className="sm:col-span-2">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground mb-2">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.chronic_conditions.map(c => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {patient.notes && (
              <Card className="sm:col-span-2">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Edit3 className="w-3 h-3" />Doctor's Notes</p>
                  <p className="text-sm text-foreground">{patient.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-3">
            {isLoadingRecords ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : extractedData.length === 0 ? (
              <Card className="border-dashed"><CardContent className="text-center py-12 text-muted-foreground text-sm">No extracted records yet. Upload documents to generate records.</CardContent></Card>
            ) : (
              extractedData.map(ed => {
                const sd = ed.structured_data as Record<string, unknown> | null;
                return (
                  <Card key={ed.id}>
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{ed.document_category}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(ed.extraction_timestamp).toLocaleDateString()}</span>
                      </div>
                      {sd?.summary && <p className="text-sm text-muted-foreground mb-2">{sd.summary as string}</p>}
                      {Array.isArray(sd?.lab_values) && (sd.lab_values as Array<{name: string; value: string; unit?: string; status?: string}>).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground">Lab Values</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(sd.lab_values as Array<{name: string; value: string; unit?: string; status?: string}>).slice(0, 8).map((lv, i) => (
                              <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                                <span className="text-muted-foreground">{lv.name}</span>
                                <span className={`font-medium ${lv.status === 'high' || lv.status === 'critical' ? 'text-destructive' : lv.status === 'low' ? 'text-primary' : 'text-foreground'}`}>
                                  {lv.value}{lv.unit ? ` ${lv.unit}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <DocumentUpload patientId={patient.patient_id} patientProfileId={patient.id} doctorId={currentUser?.id || ''} />
        )}

        {activeTab === 'ml' && (
          <MLAnalysis patientId={patient.patient_id} patientProfileId={patient.id} patientData={patientData} />
        )}

        {activeTab === 'medications' && (
          <MedicationSuggestions patientId={patient.patient_id} patientProfileId={patient.id} patientData={patientData} />
        )}

        {activeTab === 'chat' && (
          <Card>
            <AIChat patientId={patient.patient_id} patientData={patientData} roleType="doctor" />
          </Card>
        )}
      </div>
    </div>
  );
}
