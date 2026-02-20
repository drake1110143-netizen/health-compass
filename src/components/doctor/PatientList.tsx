import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PatientProfile } from '@/types/medical';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, UserPlus, Users, ChevronRight, Loader2, 
  AlertCircle, Calendar, Droplets, Phone, Copy, Check
} from 'lucide-react';
import AddPatientModal from './AddPatientModal';

interface PatientListProps {
  onSelectPatient: (patient: PatientProfile) => void;
}

const ITEMS_PER_PAGE = 10;

export default function PatientList({ onSelectPatient }: PatientListProps) {
  const { currentUser } = useSession();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [filtered, setFiltered] = useState<PatientProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('doctor_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPatients(data || []);
      setFiltered(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      patients.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        p.patient_id.toLowerCase().includes(q) ||
        (p.phone || '').includes(q)
      )
    );
    setPage(1);
  }, [search, patients]);

  const copyPatientId = async (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(patientId);
    setCopiedId(patientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const genderColor = (g?: string) => {
    if (!g) return 'bg-muted text-muted-foreground';
    return g.toLowerCase() === 'male' ? 'bg-primary/10 text-primary' : 'bg-pink-100 text-pink-700';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} patient{filtered.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="shrink-0">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, patient ID, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : paged.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <div className="p-4 rounded-full bg-muted/50">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">
              {search ? 'No patients match your search' : 'No patients yet'}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Patient
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {paged.map((patient) => (
            <Card
              key={patient.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
              onClick={() => onSelectPatient(patient)}
            >
              <CardContent className="flex items-center gap-4 py-4 px-5">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary">
                  {patient.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-card-foreground">{patient.full_name}</p>
                    {patient.gender && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${genderColor(patient.gender)}`}>
                        {patient.gender}
                      </span>
                    )}
                    {patient.blood_type && (
                      <Badge variant="outline" className="text-xs">
                        <Droplets className="w-3 h-3 mr-1" />
                        {patient.blood_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span 
                      className="flex items-center gap-1 font-mono bg-muted/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={(e) => copyPatientId(e, patient.patient_id)}
                    >
                      {copiedId === patient.patient_id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {patient.patient_id}
                    </span>
                    {patient.date_of_birth && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                      </span>
                    )}
                    {patient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {patient.phone}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchPatients(); }}
        />
      )}
    </div>
  );
}
