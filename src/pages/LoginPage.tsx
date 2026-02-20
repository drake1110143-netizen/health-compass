import React, { useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { UserRole } from '@/types/medical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Stethoscope, User, Shield, AlertCircle, Loader2, Activity } from 'lucide-react';

export default function LoginPage() {
  const { login } = useSession();
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) { setError('Please select a role'); return; }
    if (!fullName.trim()) { setError('Please enter your full name'); return; }

    setIsLoading(true);
    setError('');
    const result = await login(fullName, selectedRole);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">MediCore AI</h1>
          <p className="text-muted-foreground text-sm">
            AI-Powered Medical Management System
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-card-foreground text-center">Sign In</h2>
            <p className="text-sm text-muted-foreground text-center">
              Select your role and enter your full name
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedRole('doctor'); setError(''); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedRole === 'doctor'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <Stethoscope className="w-6 h-6" />
                    <span className="text-sm font-medium">Doctor</span>
                    <span className="text-xs opacity-70">Full Access</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedRole('patient'); setError(''); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedRole === 'patient'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <User className="w-6 h-6" />
                    <span className="text-sm font-medium">Patient</span>
                    <span className="text-xs opacity-70">My Records</span>
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(''); }}
                  className="bg-background"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isLoading || !selectedRole}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Info */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  New users are automatically registered. Patient accounts require prior registration by a doctor.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
