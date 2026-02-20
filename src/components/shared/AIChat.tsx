import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/types/medical';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, User, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface AIChatProps {
  patientId: string;
  patientData: Record<string, unknown>;
  roleType: 'doctor' | 'patient';
}

export default function AIChat({ patientId, patientData, roleType }: AIChatProps) {
  const { currentUser } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('chat_history')
      .select('*')
      .eq('patient_id', patientId)
      .eq('role_type', roleType)
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages((data || []) as ChatMessage[]);
    setIsLoading(false);
  }, [patientId, roleType]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      patient_id: patientId,
      user_id: currentUser?.id,
      role_type: roleType,
      sender: 'user',
      message: userMsg,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      // Get additional context
      const [{ data: extractedData }, { data: mlData }, { data: riskData }] = await Promise.all([
        supabase.from('extracted_data').select('structured_data, document_category').eq('patient_id', patientId).limit(5),
        supabase.from('ml_predictions').select('prediction_type, risk_level, recommendations').eq('patient_id', patientId).limit(3),
        supabase.from('risk_assessments').select('overall_risk_level, recommendations').eq('patient_id', patientId).limit(1),
      ]);

      const context = {
        patient_profile: patientData,
        recent_extractions: extractedData || [],
        ml_predictions: mlData || [],
        risk_assessment: riskData?.[0] || null,
      };

      const { data: response, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          patientId,
          userId: currentUser?.id,
          roleType,
          message: userMsg,
          patientContext: context,
        },
      });

      if (error) throw new Error(error.message);

      const assistantMsg: ChatMessage = {
        id: 'resp-' + Date.now(),
        patient_id: patientId,
        user_id: undefined,
        role_type: roleType,
        sender: 'assistant',
        message: response?.message || 'Unable to process request',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), 
        { ...tempMsg, id: 'user-' + Date.now() }, 
        assistantMsg
      ]);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      console.error('Chat error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">MediCore AI Assistant</p>
            <p className="text-xs text-muted-foreground">Responds using only stored patient data</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchMessages}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Start a conversation</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Ask about this patient's records, test results, medications, or risk factors
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.sender === 'user' ? 'bg-primary/20' : 'bg-secondary/20'
              }`}>
                {msg.sender === 'user' ? (
                  <User className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-secondary" />
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] space-y-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-card-foreground rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
                <p className="text-xs text-muted-foreground px-1">{formatTime(msg.created_at)}</p>
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-secondary" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about patient records, test results, medications..."
          className="flex-1 bg-background"
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isSending}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
