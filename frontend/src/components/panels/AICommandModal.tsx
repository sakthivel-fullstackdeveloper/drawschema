import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSchemaStore } from '../../store/schemaStore';
import { generateAIActionPlan, type AIAction, type ChatTurn } from '../../services/ai';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { 
  Sparkles, X, Check, AlertCircle, Loader2, Table as TableIcon, HelpCircle, 
  ArrowRight, PlusCircle, Edit3, Volume2, VolumeX, 
  Square, Play, Mic, Cpu, Settings2, Activity
} from 'lucide-react';

interface AICommandModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICommandModal: React.FC<AICommandModalProps> = ({ 
  isOpen, 
  onClose
}) => {
  const { currentProject, executeAIPlan } = useSchemaStore();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planExplanation, setPlanExplanation] = useState<string | null>(null);
  const [proposedActions, setProposedActions] = useState<AIAction[] | null>(null);
  const [applying, setApplying] = useState(false);

  // Monotonically increasing request ID & AbortController to cancel obsolete AI requests
  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-execute low-risk actions preference
  const [autoExecuteLowRisk, setAutoExecuteLowRisk] = useState<boolean>(() => {
    return localStorage.getItem('drawschema_voice_auto_execute') !== 'false';
  });

  // Toggle voice spoken responses
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('drawschema_voice_output_enabled') !== 'false';
  });

  // Conversational Turns History
  const [conversationHistory, setConversationHistory] = useState<ChatTurn[]>([]);
  const conversationHistoryRef = useRef<ChatTurn[]>([]);

  // Keep ref synchronized with state for synchronous turn access
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  // Queue for handling rapid consecutive speech instructions without dropping turns
  const executionQueueRef = useRef<string[]>([]);
  const isExecutingTurnRef = useRef<boolean>(false);

  // Central User Interruption / Barge-In Coordinator
  const handleUserInterruption = (reason: string = 'User interaction') => {
    activeRequestIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    console.log(`[Interruption] Handled (${reason}) - Request ID bumped to ${activeRequestIdRef.current}`);
  };

  // Full-Duplex Persistent Voice Session Hook
  const {
    sessionState,
    isSessionActive,
    isListening,
    isSpeaking,
    interimTranscript,
    audioLevel,
    error: voiceError,
    startSession,
    stopSession,
    interrupt,
    setProcessingState,
    setExecutingState,
    setAwaitingConfirmationState,
    speak: speakOutput,
    stopSpeaking,
    clearTranscript
  } = useVoiceSession({
    lang: 'en-IN',
    voiceOutputEnabled,
    autoLoop: true, // Key requirement: automatically resumes listening after assistant finishes speaking!
    onInterrupted: (reason) => {
      handleUserInterruption(reason);
    },
    onInterimTranscript: (interimText) => {
      // Only treat confirmed speech with substantive content as barge-in user interaction
      // Single characters, punctuation, or empty/noise artifacts must not abort active requests
      const cleaned = (interimText || '').trim();
      if (cleaned.length >= 2 && /[a-zA-Z0-9]{2,}/.test(cleaned)) {
        handleUserInterruption(`Interim voice input: "${cleaned}"`);
      }
    },
    onFinalTranscript: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Automatically trigger plan generation without needing manual submit or toggling mic!
      handleAutomaticTurnExecution(trimmed);
    },
    onError: (err) => {
      setError(err);
    }
  });

  // Helper: Speak response if voice output is enabled
  const speakAssistant = (text: string, onEnd?: () => void) => {
    if (voiceOutputEnabled) {
      speakOutput(text, onEnd);
    } else if (onEnd) {
      onEnd();
    }
  };

  // Helper: Determine if all actions in a plan are low-risk creation operations
  const isPlanLowRisk = (actions: AIAction[]): boolean => {
    if (!actions || actions.length === 0) return false;
    return actions.every(
      (a) =>
        a.type === 'CREATE_TABLE' ||
        a.type === 'ADD_COLUMN' ||
        a.type === 'EXPLAIN_SCHEMA' ||
        a.type === 'ANALYZE_SCHEMA'
    );
  };

  // Execute an action plan (reused by both auto-execution and manual confirmation button)
  const executePlanDirect = async (actionsToApply: AIAction[], explanationText: string, requestId?: number) => {
    if (requestId !== undefined && requestId !== activeRequestIdRef.current) {
      console.warn('Execution ignored for obsolete request ID:', requestId);
      return;
    }

    if (!actionsToApply || actionsToApply.length === 0 || !currentProject || applying) return;

    setApplying(true);
    setExecutingState(true);
    setError(null);

    try {
      await executeAIPlan({
        explanation: explanationText || 'AI Command Execution',
        actions: actionsToApply
      });

      if (requestId !== undefined && requestId !== activeRequestIdRef.current) {
        return;
      }

      const confirmedAssistantTurn: ChatTurn = {
        role: 'assistant',
        content: `${explanationText} (Executed successfully on schema)`
      };
      conversationHistoryRef.current = [...conversationHistoryRef.current, confirmedAssistantTurn];
      setConversationHistory(conversationHistoryRef.current);

      // Speak verbal confirmation of success (which upon completion auto-resumes listening!)
      speakAssistant(`Success: ${explanationText}`);

      setPrompt('');
      clearTranscript();
      setProposedActions(null);
      setPlanExplanation(null);
    } catch (err: any) {
      const errMsg = err.message || 'Failed to apply schema mutations';
      setError(errMsg);
      speakAssistant(`Execution failed: ${errMsg}`);
    } finally {
      setApplying(false);
      setExecutingState(false);
    }
  };

  // Process next turn in queue if rapid voice commands arrive
  const processNextTurnInQueue = () => {
    if (executionQueueRef.current.length > 0 && !isExecutingTurnRef.current) {
      const nextTurn = executionQueueRef.current.shift();
      if (nextTurn) {
        handleAutomaticTurnExecution(nextTurn);
      }
    }
  };

  // Automatic Turn Execution triggered directly by speech recognition end-of-turn
  const handleAutomaticTurnExecution = async (instructionText: string) => {
    if (!instructionText || !currentProject) return;

    // If an execution or plan generation is already actively running, safely queue it so it's not lost!
    if (isExecutingTurnRef.current || applying) {
      console.log('[Queue] Enqueuing rapid command:', instructionText);
      executionQueueRef.current.push(instructionText);
      return;
    }

    isExecutingTurnRef.current = true;
    interrupt('New user turn ready');
    handleUserInterruption('Automatic speech turn');

    const currentRequestId = ++activeRequestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setProcessingState(true);
    setError(null);
    setProposedActions(null);
    setPlanExplanation(null);

    // Update conversation history synchronously via ref to avoid React state batching race conditions
    const updatedHistory: ChatTurn[] = [
      ...conversationHistoryRef.current,
      { role: 'user', content: instructionText }
    ];
    conversationHistoryRef.current = updatedHistory;
    setConversationHistory(updatedHistory);

    try {
      const res = await generateAIActionPlan(
        currentProject.id,
        instructionText,
        updatedHistory,
        controller.signal
      );

      if (currentRequestId !== activeRequestIdRef.current) {
        return;
      }

      if (res.success && res.data) {
        const explanation = res.data.explanation || 'Action plan ready';
        const actions = res.data.actions || [];

        // If there are NO database mutation actions (e.g., greetings, conceptual Q&A, redirects, clarifications)
        if (actions.length === 0) {
          setProposedActions(null);
          setPlanExplanation(null);
          const assistantTurn: ChatTurn = { role: 'assistant', content: explanation };
          conversationHistoryRef.current = [...conversationHistoryRef.current, assistantTurn];
          setConversationHistory(conversationHistoryRef.current);
          speakAssistant(explanation);
          return;
        }

        // Schema mutation actions present:
        setPlanExplanation(explanation);
        setProposedActions(actions);

        if (autoExecuteLowRisk && isPlanLowRisk(actions)) {
          await executePlanDirect(actions, explanation, currentRequestId);
        } else {
          setAwaitingConfirmationState();
          speakAssistant(`${explanation}. Please review and confirm the changes.`);
        }
      } else {
        const failMsg = res.message || 'Failed to generate action plan';
        setError(failMsg);
        speakAssistant(failMsg);
      }
    } catch (err: any) {
      if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || currentRequestId !== activeRequestIdRef.current) {
        return;
      }
      const failMsg = err.message || 'Error communicating with AI service';
      setError(failMsg);
      speakAssistant(failMsg);
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoading(false);
        setProcessingState(false);
        abortControllerRef.current = null;
      }
      isExecutingTurnRef.current = false;
      // If any rapid voice commands arrived in the queue while this turn was processing, run the next one now!
      setTimeout(processNextTurnInQueue, 50);
    }
  };

  // Manual submission form handler (for text fallback)
  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || !currentProject || loading || applying) return;

    const currentText = prompt.trim();
    setPrompt('');
    await handleAutomaticTurnExecution(currentText);
  };

  const handleApplyChanges = async () => {
    if (!proposedActions || !planExplanation) return;
    await executePlanDirect(proposedActions, planExplanation, activeRequestIdRef.current);
  };

  const handleCancelPlan = () => {
    interrupt('User cancelled plan');
    handleUserInterruption('Plan cancelled');
    setProposedActions(null);
    setPlanExplanation(null);
    setError(null);
  };

  // Stop session & audio when modal closes, and abort pending requests
  useEffect(() => {
    if (!isOpen) {
      stopSession();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeRequestIdRef.current += 1;
    }
  }, [isOpen, stopSession]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-[430px] max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div 
        className="relative w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[550px] max-h-[calc(100vh-9.5rem)] border-indigo-500/30 ring-1 ring-indigo-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Robot reference */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <img 
                  src="/robot1.gif" 
                  alt="Robot" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes('robot-avatar.png')) {
                      img.src = '/robot-avatar.png';
                    }
                  }}
                />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                isSessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Voice AI Copilot
              </h3>
              <p className="text-[11px] text-slate-400">
                {isSessionActive ? 'Continuous listening active • Just speak' : 'Start conversation to talk naturally'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nextVal = !voiceOutputEnabled;
                if (!nextVal && isSpeaking) stopSpeaking();
                setVoiceOutputEnabled(nextVal);
                localStorage.setItem('drawschema_voice_output_enabled', String(nextVal));
              }}
              title={voiceOutputEnabled ? 'Voice output: Enabled' : 'Voice output: Muted'}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
                voiceOutputEnabled
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {voiceOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Persistent Voice Session Controller Bar */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            {!isSessionActive ? (
              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all duration-150"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Conversation</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopSession}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-semibold transition"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>End Conversation</span>
              </button>
            )}

            {/* Barge-In / Interruption indicator */}
            {sessionState === 'interrupted' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Interrupted
              </span>
            )}

            <div className="text-[11px] text-slate-400 font-medium">
              {sessionState === 'assistant_speaking' && <span className="text-cyan-400 flex items-center gap-1"><Volume2 className="w-3 h-3 animate-pulse" /> Speaking...</span>}
              {sessionState === 'listening' && <span className="text-emerald-400 flex items-center gap-1"><Mic className="w-3 h-3 animate-pulse" /> Listening...</span>}
              {sessionState === 'user_speaking' && <span className="text-rose-400 flex items-center gap-1"><Mic className="w-3 h-3 animate-ping" /> Hearing speech...</span>}
              {sessionState === 'processing' && <span className="text-indigo-400 flex items-center gap-1"><Cpu className="w-3 h-3 animate-spin" /> Thinking...</span>}
              {sessionState === 'executing' && <span className="text-amber-400 flex items-center gap-1"><Settings2 className="w-3 h-3 animate-spin" /> Executing...</span>}
              {sessionState === 'idle' && <span className="text-slate-500">Ready to speak</span>}
            </div>
          </div>

          {/* Workflow Steps (grid layout, no horizontal scroll) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/50">
            <div className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition ${
              sessionState === 'listening' || sessionState === 'user_speaking'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold' 
                : 'bg-slate-900/60 text-slate-500 border border-slate-800/50'
            }`}>
              <Mic className="w-2.5 h-2.5 shrink-0" />
              <span>Listen</span>
            </div>

            <div className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition ${
              sessionState === 'processing' 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold' 
                : 'bg-slate-900/60 text-slate-500 border border-slate-800/50'
            }`}>
              <Cpu className="w-2.5 h-2.5 shrink-0" />
              <span>Think</span>
            </div>

            <div className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition ${
              sessionState === 'executing' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold' 
                : 'bg-slate-900/60 text-slate-500 border border-slate-800/50'
            }`}>
              <Settings2 className="w-2.5 h-2.5 shrink-0" />
              <span>Execute</span>
            </div>

            <div className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition ${
              sessionState === 'assistant_speaking' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold animate-pulse' 
                : 'bg-slate-900/60 text-slate-500 border border-slate-800/50'
            }`}>
              <Volume2 className="w-2.5 h-2.5 shrink-0" />
              <span>Speak</span>
            </div>
          </div>
        </div>

        {/* Fixed Voice Activity Indicator (Speaking & Listening Bar) - Stays pinned at top */}
        {isSessionActive && (
          <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/70 flex flex-col items-center justify-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 h-5">
              {[...Array(16)].map((_, i) => {
                const barHeight = Math.max(
                  4, 
                  Math.min(20, (audioLevel / 100) * 20 * (Math.sin(i * 0.5 + Date.now() * 0.005) * 0.5 + 0.8))
                );
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      sessionState === 'assistant_speaking'
                        ? 'bg-cyan-400'
                        : sessionState === 'user_speaking'
                        ? 'bg-rose-400'
                        : 'bg-indigo-500'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className={`w-2 h-2 rounded-full ${
                sessionState === 'assistant_speaking'
                  ? 'bg-cyan-400 animate-pulse'
                  : sessionState === 'user_speaking'
                  ? 'bg-rose-400 animate-ping'
                  : 'bg-emerald-400 animate-pulse'
              }`} />
              <span className="font-medium text-[11px]">
                {sessionState === 'assistant_speaking' 
                  ? 'Speaking... Interrupt anytime by talking' 
                  : sessionState === 'user_speaking'
                  ? 'Listening to you...'
                  : 'Listening.. Speak naturally (Always ready)'}
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Chat & Action Plan Area - Single unified scroll container */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Live interim transcript */}
          {isListening && interimTranscript && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/90 border border-indigo-500/30 text-xs text-indigo-300 font-mono animate-fade-in">
              <Activity className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 animate-pulse" />
              <span className="truncate italic">"{interimTranscript}..."</span>
            </div>
          )}

          {/* Conversation Turns Stream - Seamlessly flows inside the unified scroll container */}
          {conversationHistory.length > 0 && (
            <div className="space-y-2.5">
              {conversationHistory.map((turn, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col p-2.5 rounded-xl text-xs space-y-1 ${
                    turn.role === 'user'
                      ? 'bg-slate-800/80 border border-slate-700/60 ml-6 text-slate-200'
                      : 'bg-indigo-950/40 border border-indigo-900/40 mr-6 text-indigo-200'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    {turn.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <p className="leading-relaxed">{turn.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Plan Preview Card */}
          {proposedActions && proposedActions.length > 0 && (
            <div className="rounded-xl border border-indigo-500/30 bg-slate-950/80 p-4 space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Proposed Schema Changes</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Confirmation Required
                </span>
              </div>

              {planExplanation && (
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  {planExplanation}
                </p>
              )}

              {/* Actions List */}
              <div className="space-y-2">
                {proposedActions.map((action, idx) => (
                  <div key={idx} className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs">
                    {action.type === 'CREATE_TABLE' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TableIcon className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-white">Create Table:</span>
                          <span className="font-mono text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50">
                            {action.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{action.columns.length} cols</span>
                      </div>
                    )}
                    {action.type === 'ADD_COLUMN' && (
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Column</span>
                        <span className="font-mono text-emerald-300 font-bold">{action.column.name}</span>
                        <span>to</span>
                        <span className="font-mono text-indigo-300">{action.tableName}</span>
                      </div>
                    )}
                    {action.type === 'RENAME_COLUMN' && (
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Rename in</span>
                        <span className="font-mono text-indigo-300">{action.tableName}</span>:
                        <span className="line-through text-slate-500">{action.oldColumnName}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <span className="font-mono text-cyan-300">{action.newColumnName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleCancelPlan}
                  disabled={applying}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyChanges}
                  disabled={applying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Confirm & Apply</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {(error || voiceError) && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-xs text-red-400 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error || voiceError}</div>
            </div>
          )}
        </div>

        {/* Fixed Text Input Bar at bottom (above footer) */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800/80">
          <form onSubmit={handleGeneratePlan} className="space-y-0">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => {
                  handleUserInterruption('Text typing');
                  setPrompt(e.target.value);
                }}
                placeholder={isSessionActive ? 'Continuous voice active... Or type an instruction' : 'Type an instruction or click Start Conversation above'}
                disabled={loading || applying}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || applying || !prompt.trim()}
                className="absolute right-2 top-2 p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-slate-950/95 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Auto-execute low-risk actions</span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoExecuteLowRisk}
            onClick={() => {
              const nextVal = !autoExecuteLowRisk;
              setAutoExecuteLowRisk(nextVal);
              localStorage.setItem('drawschema_voice_auto_execute', String(nextVal));
            }}
            className="flex items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
          >
            <span className={`text-[11px] font-semibold transition-colors ${
              autoExecuteLowRisk ? 'text-indigo-400' : 'text-slate-500'
            }`}>
              {autoExecuteLowRisk ? 'Enabled' : 'Disabled'}
            </span>
            <div
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out border ${
                autoExecuteLowRisk 
                  ? 'bg-indigo-600 border-indigo-500 shadow-sm shadow-indigo-500/30' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  autoExecuteLowRisk ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
