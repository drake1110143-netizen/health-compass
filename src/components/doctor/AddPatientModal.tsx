import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/context/SessionContext';
import { DOCUMENT_CATEGORIES } from '@/types/medical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Loader2, AlertCircle, CheckCircle2, User, Calendar, Droplets, Phone, Mail } from 'lucide-react';

interface AddPatientModalProps {
  onClose: () => void;
  onSuccess: (patientId: string) => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function AddPatientModal({ onClose, onSuccess }: AddPatientModalProps) {
  const { currentUser } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    allergies: '',
    chronic_conditions: '',
    notes: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.full_name.trim()) { setError('Patient full name is required'); return; }

    setIsLoading(true);
    setError('');

    try {
      // Generate patient ID
      const { data: idData, error: idError } = await supabase.rpc('generate_patient_id');
      if (idError || !idData) throw new Error('Failed to generate Patient ID');

      const allergiesArr = form.allergies.split(',').map(s => s.trim()).filter(Boolean);
      const conditionsArr = form.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean);

      const { data: patient, error: insertError } = await supabase
        .from('patient_profiles')
        .insert({
          patient_id: idData,
          full_name: form.full_name.trim(),
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          blood_type: form.blood_type || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          emergency_contact: form.emergency_contact || null,
          allergies: allergiesArr.length > 0 ? allergiesArr : null,
          chronic_conditions: conditionsArr.length > 0 ? conditionsArr : null,
          notes: form.notes || null,
          doctor_id: currentUser.id,
        })
        .select()
        .single();

      if (insertError || !patient) throw new Error(insertError?.message || 'Failed to create patient');

      setGeneratedId(idData);
      setSuccess(`Patient registered successfully! Patient ID: ${idData}`);
      setTimeout(() => onSuccess(idData), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-border">
        <CardHeader className="sticky top-0 bg-card z-10 border-b border-border flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg font-bold">Add New Patient</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">A unique Patient ID will be auto-generated</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardHeader>

        <CardContent className="p-5">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="w-12 h-12 text-chart-1" />
              <p className="text-center text-foreground font-medium">{success}</p>
              <div className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <p className="font-mono text-primary font-bold text-lg">{generatedId}</p>
              </div>
              <p className="text-xs text-muted-foreground">Share this ID with the patient for portal access</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Full Name *</label>
                    <Input placeholder="Patient's full name" value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Date of Birth</label>
                    <Input type="date" value={form.date_of_birth} onChange={e => handleChange('date_of_birth', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Gender</label>
                    <select
                      value={form.gender}
                      onChange={e => handleChange('gender', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Blood Type</label>
                    <select
                      value={form.blood_type}
                      onChange={e => handleChange('blood_type', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select blood type</option>
                      {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Phone</label>
                    <Input placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                    <Input type="email" placeholder="patient@email.com" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Address</label>
                    <Input placeholder="Full address" value={form.address} onChange={e => handleChange('address', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Emergency Contact</label>
                    <Input placeholder="Name & phone number" value={form.emergency_contact} onChange={e => handleChange('emergency_contact', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Medical Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Droplets className="w-4 h-4 text-primary" /> Medical Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Known Allergies (comma-separated)</label>
                    <Input placeholder="e.g., Penicillin, Sulfa drugs, Latex" value={form.allergies} onChange={e => handleChange('allergies', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Chronic Conditions (comma-separated)</label>
                    <Input placeholder="e.g., Diabetes Type 2, Hypertension, Asthma" value={form.chronic_conditions} onChange={e => handleChange('chronic_conditions', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Doctor's Notes</label>
                    <textarea
                      placeholder="Initial clinical notes, observations..."
                      value={form.notes}
                      onChange={e => handleChange('notes', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none h-20"
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add Patient & Generate ID'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
