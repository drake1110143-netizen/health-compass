import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Report, ExtractedData, DocumentCategory, DOCUMENT_CATEGORIES } from '@/types/medical';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, Clock, 
  Loader2, AlertCircle, Eye, ChevronDown, X, RefreshCw
} from 'lucide-react';

interface DocumentUploadProps {
  patientId: string;
  patientProfileId: string;
  doctorId: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export default function DocumentUpload({ patientId, patientProfileId, doctorId }: DocumentUploadProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('Blood Test Report');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'validating' | 'extracting' | 'done' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [validationResult, setValidationResult] = useState<{ is_match: boolean; confidence: number; message: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('upload_timestamp', { ascending: false });
    setReports((data || []) as Report[]);
    setIsLoadingReports(false);
  }, [patientId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) { setUploadMessage('File too large. Max 50MB.'); return; }
    if (!ALLOWED_MIME.includes(f.type)) { setUploadMessage('Unsupported file type. Use PDF or images.'); return; }
    setFile(f);
    setUploadMessage('');
    setValidationResult(null);
    setPendingConfirm(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const doUpload = async (skipValidation = false) => {
    if (!file) return;
    setIsUploading(true);
    setPendingConfirm(false);

    try {
      // Step 1: Upload file to storage
      setUploadStatus('uploading');
      setUploadMessage('Uploading document...');

      const ext = file.name.split('.').pop();
      const storagePath = `${patientId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { error: storageError } = await supabase.storage
        .from('medical-documents')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (storageError) throw new Error(`Storage error: ${storageError.message}`);

      // Step 2: Create report record
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          patient_id: patientId,
          patient_profile_id: patientProfileId,
          doctor_id: doctorId,
          document_category: selectedCategory,
          original_filename: file.name,
          storage_path: storagePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          ai_validation_status: 'pending',
          ocr_status: 'pending',
        })
        .select()
        .single();

      if (reportError || !report) throw new Error('Failed to create report record');

      // Step 3: AI Validation (unless skipped)
      if (!skipValidation) {
        setUploadStatus('validating');
        setUploadMessage('AI is validating document category...');

        const { data: validationData, error: valError } = await supabase.functions.invoke('ai-validate-document', {
          body: {
            extractedText: file.name + ' ' + selectedCategory,
            selectedCategory,
            filename: file.name,
          },
        });

        if (!valError && validationData?.success) {
          const vr = validationData.result;
          
          // Update report with validation result
          await supabase.from('reports').update({
            ai_validation_status: vr.is_match ? 'validated' : 'mismatch',
            ai_validation_message: vr.validation_notes,
            ai_validation_confidence: vr.confidence,
          }).eq('id', report.id);

          await supabase.from('ai_validation_results').insert({
            report_id: report.id,
            patient_id: patientId,
            selected_category: selectedCategory,
            detected_category: vr.detected_category,
            is_match: vr.is_match,
            confidence: vr.confidence,
            keywords_found: vr.keywords_found || [],
            validation_notes: vr.validation_notes,
          });

          if (!vr.is_match && vr.confidence < 0.5) {
            setValidationResult({
              is_match: false,
              confidence: vr.confidence,
              message: `Document appears to be "${vr.detected_category}" but you selected "${selectedCategory}". ${vr.validation_notes}`,
            });
            setPendingConfirm(true);
            // Delete the temp report until confirmed
            await supabase.from('reports').delete().eq('id', report.id);
            await supabase.storage.from('medical-documents').remove([storagePath]);
            setIsUploading(false);
            setUploadStatus('idle');
            return;
          }
        }
      }

      // Step 4: OCR Extraction
      setUploadStatus('extracting');
      setUploadMessage('Running OCR extraction...');

      await supabase.from('reports').update({ ocr_status: 'processing' }).eq('id', report.id);

      const { error: ocrError } = await supabase.functions.invoke('ocr-extract', {
        body: {
          reportId: report.id,
          patientId,
          storagePath,
          documentCategory: selectedCategory,
        },
      });

      if (ocrError) {
        await supabase.from('reports').update({ ocr_status: 'error' }).eq('id', report.id);
      }

      setUploadStatus('done');
      setUploadMessage('Document uploaded and processed successfully!');
      setFile(null);
      setValidationResult(null);
      await fetchReports();

      setTimeout(() => { setUploadStatus('idle'); setUploadMessage(''); }, 3000);
    } catch (err: unknown) {
      setUploadStatus('error');
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      validated: { color: 'bg-chart-1/15 text-chart-1 border-chart-1/30', icon: <CheckCircle className="w-3 h-3" />, label: 'Validated' },
      mismatch: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <AlertTriangle className="w-3 h-3" />, label: 'Mismatch' },
      pending: { color: 'bg-muted/50 text-muted-foreground border-border', icon: <Clock className="w-3 h-3" />, label: 'Pending' },
      error: { color: 'bg-destructive/10 text-destructive border-destructive/30', icon: <AlertCircle className="w-3 h-3" />, label: 'Error' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${s.color}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Upload Medical Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Dropdown */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Document Category *</label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as DocumentCategory)}
                className="w-full h-10 pl-3 pr-8 rounded-md border border-input bg-background text-sm appearance-none cursor-pointer"
                disabled={isUploading}
              >
                {DOCUMENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-primary/3'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              {file ? (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <button onClick={() => setFile(null)} className="p-0.5 rounded hover:bg-muted">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WebP — Max 50MB</p>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Mismatch Warning */}
          {validationResult && !validationResult.is_match && pendingConfirm && (
            <div className="p-4 rounded-lg bg-accent border border-border space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Mismatch Detected</p>
                  <p className="text-xs text-muted-foreground mt-1">{validationResult.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">Confidence: {Math.round(validationResult.confidence * 100)}%</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setPendingConfirm(false); setValidationResult(null); }}>
                  Change Category
                </Button>
                <Button size="sm" onClick={() => doUpload(true)}>
                  Upload Anyway
                </Button>
              </div>
            </div>
          )}

          {/* Status */}
          {uploadStatus !== 'idle' && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              uploadStatus === 'done' ? 'bg-chart-1/10 border border-chart-1/30' :
              uploadStatus === 'error' ? 'bg-destructive/10 border border-destructive/30' :
              'bg-primary/5 border border-primary/20'
            }`}>
              {(uploadStatus === 'uploading' || uploadStatus === 'validating' || uploadStatus === 'extracting') && (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              )}
              {uploadStatus === 'done' && <CheckCircle className="w-4 h-4 text-chart-1 shrink-0" />}
              {uploadStatus === 'error' && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
              <p className={`text-sm ${uploadStatus === 'done' ? 'text-chart-1' : uploadStatus === 'error' ? 'text-destructive' : 'text-foreground'}`}>
                {uploadMessage}
              </p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={() => doUpload(false)}
            disabled={!file || isUploading || pendingConfirm}
            className="w-full"
          >
            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Upload & Validate Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Uploaded Documents
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchReports}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{report.original_filename}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">{report.document_category}</Badge>
                      {statusBadge(report.ai_validation_status)}
                      <span className="text-xs text-muted-foreground">
                        OCR: {report.ocr_status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.upload_timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
