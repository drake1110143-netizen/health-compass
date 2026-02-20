import React, { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { PatientProfile } from '@/types/medical';
import DoctorSidebar from '@/components/doctor/DoctorSidebar';
import PatientList from '@/components/doctor/PatientList';
import PatientProfileView from '@/components/doctor/PatientProfileView';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Activity, Stethoscope, Calendar } from 'lucide-react';

export default function DoctorPortal() {
  const { currentUser } = useSession();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

  const handleSelectPatient = (patient: PatientProfile) => {
    setSelectedPatient(patient);
    setActiveView('patient-profile');
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setActiveView('patients');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DoctorSidebar activeView={activeView === 'patient-profile' ? 'patients' : activeView} onViewChange={(v) => { setActiveView(v); setSelectedPatient(null); }} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 lg:p-8 pt-16 lg:pt-8">
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome, Dr. {currentUser?.full_name}</h1>
                <p className="text-muted-foreground text-sm mt-1">MediCore AI Medical Management System</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: Users, label: 'Manage Patients', desc: 'View and manage your patient roster', action: () => setActiveView('patients') },
                  { icon: Activity, label: 'AI Analysis', desc: 'Run ML predictions and risk assessments', action: () => setActiveView('patients') },
                  { icon: Stethoscope, label: 'AI Assistant', desc: 'Chat with the medical AI assistant', action: () => setActiveView('patients') },
                ].map(item => (
                  <Card key={item.label} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={item.action}>
                    <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeView === 'patients' && !selectedPatient && (
            <PatientList onSelectPatient={handleSelectPatient} />
          )}

          {activeView === 'patient-profile' && selectedPatient && (
            <PatientProfileView patient={selectedPatient} onBack={handleBack} />
          )}
        </div>
      </main>
    </div>
  );
}
