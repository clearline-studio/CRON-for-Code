import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Paperclip, Send, X } from 'lucide-react';
import type { DataService } from '@cron-code/data-service';
import { useWorkspaceStore } from '../context.js';
import type { LlmAttachment, LlmClient, LlmConfig, LlmRoute } from '../llm.js';
import {
  buildOpenCodeHandoffPrompt,
  chatPreferenceKey,
  compactContext,
  createChatMessage,
  DEFAULT_LLM_CONFIG,
  fileToLlmAttachment,
  isGoSignal,
  resolveRouteStatus,
  safeParseMessages,
} from '../chat-runtime.js';
import type { ChatMessage } from '../chat-runtime.js';
import { humanizeEvent, humanizeSummary, friendlyModelName, summarizeActivity } from '../activity-english.js';
import type { OpenCodeRunEvent, OpenCodeRunnerClient, OpenCodeRunResult } from '../opencode-client.js';

interface CronAssistantProps {
  dataService?: DataService;
  llm?: LlmClient;
  openCodeRunner?: OpenCodeRunnerClient;
  config: LlmConfig | null;
  sessionId?: string;
  /** Opens the model/settings dialog (the Model control's real action). */
  onConfigureModel?: () => void;
}

export function CronAssistant({ dataService, llm, openCodeRunner, config, sessionId = 'default', onConfigureModel }: CronAssistantProps) {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const projects = useWorkspaceStore((s) => s.projects);
  const createDraftTask = useWorkspaceStore((s) => s.createDraftTask);
  const refreshTasks = useWorkspaceStore((s) => s.refreshTasks);
  const refreshApprovals = useWorkspaceStore((s) => s.refreshApprovals);
  const refreshExecutions = useWorkspaceStore((s) => s.refreshExecutions);
  const project = activeProjectId ? projects.find((candidate) => candidate.id === activeProjectId) ?? null : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<LlmAttachment[]>([]);
  const [route, setRoute] = useState<LlmRoute>('local-chat');
  const [busy, setBusy] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [runnerResults, setRunnerResults] = useState<Record<string, OpenCodeRunResult>>({});
  const [runnerErrors, setRunnerErrors] = useState<Record<string, string>>({});
  const [liveActivity, setLiveActivity] = useState<Record<string, OpenCodeRunEvent[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const hasImages = attachments.some((file) => file.kind === 'image');
  const routeStatus = resolveRouteStatus(config, route, hasImages);

  useEffect(() => {
    if (!activeProjectId) {
      loadedKeyRef.current = null;
      setMessages([]);
      return;
    }
    const key = chatPreferenceKey(activeProjectId, sessionId);
    loadedKeyRef.current = null;
    if (!dataService) {
      loadedKeyRef.current = key;
      setMessages([]);
      return;
    }
    void dataService.preferences.get(key).then((raw) => {
      loadedKeyRef.current = key;
      setMessages(safeParseMessages(raw));
    }).catch(() => {
      loadedKeyRef.current = key;
      setMessages([]);
    });
  }, [activeProjectId, dataService, sessionId]);

  useEffect(() => {
    if (!activeProjectId || !dataService) return;
    const key = chatPreferenceKey(activeProjectId, sessionId);
    if (loadedKeyRef.current !== key) return;
    const handle = setTimeout(() => {
      void dataService.preferences.set(key, JSON.stringify(messages.slice(-80)));
    }, 150);
    return () => clearTimeout(handle);
  }, [activeProjectId, dataService, messages, sessionId]);

  useEffect(() => {
    const end = messagesEndRef.current;
    if (typeof end?.scrollIntoView === 'function') {
      end.scrollIntoView({ block: 'end' });
    }
  }, [messages, busy, runningTaskId, runnerResults, runnerErrors, liveActivity, attachments.length]);

  // Subscribe to the runner's live event stream so activity appears incrementally
  // instead of being dumped when the final result arrives.
  useEffect(() => {
    if (!openCodeRunner?.onEvent) return;
    return openCodeRunner.onEvent((event) => {
      setLiveActivity((current) => {
        const list = current[event.taskId] ?? [];
        if (list.some((entry) => entry.timestamp === event.timestamp && entry.status === event.status && entry.message === event.message)) {
          return current;
        }
        return { ...current, [event.taskId]: [...list, event] };
      });
    });
  }, [openCodeRunner]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;

    const sentAttachments = attachments;
    const selectedRoute = inferRoute(prompt, sentAttachments);
    const selectedStatus = resolveRouteStatus(config, selectedRoute, sentAttachments.some((file) => file.kind === 'image'));
    setRoute(selectedStatus.route);
    const userMessage = createChatMessage({ role: 'user', text: prompt, route: selectedStatus.route, attachments: sentAttachments });
    const nextContext = [...messages, userMessage];
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setAttachments([]);

    if (selectedRoute === 'opencode-flash' || selectedRoute === 'pro-escalation') {
      setBusy(true);
      try {
        const handoff = buildOpenCodeHandoffPrompt({ prompt, project, attachments: sentAttachments, config });
        const taskId = await createDraftTask(handoff.title, handoff.body);
        const response = taskId
          ? handoff.title
          : 'OpenCode handoff needs an open project before CRON can create the coding task.';
        setMessages((current) => [
          ...current,
          createChatMessage({ role: 'cron', text: response, route: selectedStatus.route, handoffTaskId: taskId ?? undefined }),
        ]);
        if (taskId) void handleRunHandoff(taskId, compactContext(nextContext));
      } catch (error) {
        setMessages((current) => [
          ...current,
          createChatMessage({
            role: 'cron',
            text: error instanceof Error ? error.message : 'CRON could not create the OpenCode handoff.',
            route: selectedStatus.route,
          }),
        ]);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!llm || !config) {
      setMessages((current) => [...current, createChatMessage({ role: 'cron', text: 'Connect LM Studio from Settings before starting a conversation.', route: selectedStatus.route })]);
      return;
    }

    setBusy(true);
    try {
      const contextMessages = compactContext(messages);
      const result = await llm.chat({
        config,
        model: selectedStatus.model,
        message: prompt,
        route: selectedStatus.route,
        attachments: sentAttachments,
        contextMessages,
      });
      setMessages((current) => [...current, createChatMessage({ role: 'cron', text: result.text, route: selectedStatus.route })]);
    } catch (error) {
      setMessages((current) => [...current, createChatMessage({ role: 'cron', text: error instanceof Error ? error.message : 'CC could not reach LM Studio.', route: selectedStatus.route })]);
    } finally {
      setBusy(false);
    }
  }

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;
    setBusy(true);
    try {
      const selected = await Promise.all(files.map(fileToLlmAttachment));
      setAttachments((current) => [...current, ...selected]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createChatMessage({
          role: 'cron',
          text: error instanceof Error ? error.message : 'CRON could not read the attachment.',
          route: routeStatus.route,
        }),
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunHandoff(taskId: string, contextMessages = compactContext(messages)) {
    if (runningTaskId) return;
    const model = config?.codingModel || DEFAULT_LLM_CONFIG.codingModel;
    if (!openCodeRunner) {
      setRunnerErrors((current) => ({ ...current, [taskId]: 'OpenCode runner is not connected in this host.' }));
      return;
    }
    setRunningTaskId(taskId);
    setRunnerErrors((current) => {
      const rest = { ...current };
      delete rest[taskId];
      return rest;
    });
    setLiveActivity((current) => ({ ...current, [taskId]: [] }));
    try {
      const result = await openCodeRunner.runTask({
        taskId,
        model,
        conversationContext: contextMessages,
      });
      setRunnerResults((current) => ({ ...current, [taskId]: result }));
    } catch (error) {
      setRunnerErrors((current) => ({
        ...current,
        [taskId]: error instanceof Error ? error.message : 'OpenCode runner failed before producing a structured result.',
      }));
    } finally {
      setRunningTaskId(null);
    }
  }

  async function handleApproveHandoff(taskId: string, approvalId: string) {
    if (!openCodeRunner) {
      setRunnerErrors((current) => ({ ...current, [taskId]: 'OpenCode runner is not connected in this host.' }));
      return;
    }
    setRunningTaskId(taskId);
    try {
      const result = await openCodeRunner.replyToApproval({ taskId, approvalId, decision: 'approve' });
      setRunnerResults((current) => ({ ...current, [taskId]: result }));
      await Promise.all([refreshTasks(), refreshApprovals(), refreshExecutions()]);
    } catch (error) {
      setRunnerErrors((current) => ({
        ...current,
        [taskId]: error instanceof Error ? error.message : 'OpenCode approval failed before producing a structured result.',
      }));
    } finally {
      setRunningTaskId(null);
    }
  }

  async function handleRejectHandoff(taskId: string, approvalId: string) {
    if (!openCodeRunner) {
      setRunnerErrors((current) => ({ ...current, [taskId]: 'OpenCode runner is not connected in this host.' }));
      return;
    }
    setRunningTaskId(taskId);
    try {
      const result = await openCodeRunner.replyToApproval({ taskId, approvalId, decision: 'reject', reason: 'Rejected in CRON Chat' });
      setRunnerResults((current) => ({ ...current, [taskId]: result }));
      await Promise.all([refreshTasks(), refreshApprovals(), refreshExecutions()]);
    } catch (error) {
      setRunnerErrors((current) => ({
        ...current,
        [taskId]: error instanceof Error ? error.message : 'OpenCode rejection failed before producing a structured result.',
      }));
    } finally {
      setRunningTaskId(null);
    }
  }

  return (
    <section style={workspaceStyle} data-testid="chat-panel">
      <header style={conversationHeaderStyle}>
        <div>
          <strong>Planner — Gemma</strong>
          <span style={mutedStyle}>{routeStatus.detail}</span>
        </div>
        <div style={headerRightStyle}>
          <span style={routeBadgeStyle}>{routeStatus.label}</span>
        </div>
      </header>

      <div style={statusStyle}>
        <span>{routeStatus.model}</span>
        <button
          type="button"
          onClick={() => onConfigureModel?.()}
          title="Configure routes"
          aria-label="Configure model routes"
          style={statusButtonStyle}
          data-testid="assistant-model-selector"
        >
          Routes <ChevronRight size={13} />
        </button>
      </div>

      <div style={messagesStyle} data-testid="chat-message-list">
        {messages.length === 0 ? (
          <div style={emptyStyle}>CRON keeps the context. Models stay interchangeable.</div>
        ) : messages.map((message, index) => (
          <article key={message.id || `${message.role}-${index}`} style={message.role === 'user' ? userMessageStyle : message.handoffTaskId ? cronHandoffMessageStyle : cronMessageStyle}>
            <div style={messageLabelStyle}>{message.role === 'user' ? 'YOU' : 'CRON'}</div>
            {!message.handoffTaskId && <div style={messageTextStyle}>{message.text}</div>}
            {message.attachments && message.attachments.length > 0 && (
              <div style={messageAttachmentStyle}>
                {message.attachments.map((file) => <span key={file.id}>{file.name}</span>)}
              </div>
            )}
            {message.handoffTaskId && (
              <HandoffExecutionCard
                title={message.text}
                result={runnerResults[message.handoffTaskId]}
                liveEvents={liveActivity[message.handoffTaskId] ?? []}
                error={runnerErrors[message.handoffTaskId]}
                running={runningTaskId === message.handoffTaskId}
                disabled={runningTaskId !== null}
                model={config?.codingModel || DEFAULT_LLM_CONFIG.codingModel}
                onRun={() => void handleRunHandoff(message.handoffTaskId!)}
                onApprove={(approvalId) => void handleApproveHandoff(message.handoffTaskId!, approvalId)}
                onReject={(approvalId) => void handleRejectHandoff(message.handoffTaskId!, approvalId)}
              />
            )}
          </article>
        ))}
        {busy && <div style={thinkingStyle}>CRON is thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

      {attachments.length > 0 && (
        <div style={attachmentRowStyle}>
          {attachments.map((file, index) => (
            <span key={file.id} style={attachmentStyle}>
              {file.name}
              <button onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={removeAttachmentStyle}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={composerStyle} data-testid="chat-composer">
        <input ref={fileInputRef} type="file" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach files" style={iconButtonStyle}><Paperclip size={18} /></button>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Write your message…" style={messageInputStyle} />
        <button type="submit" disabled={!input.trim() || busy} title="Send" style={sendButtonStyle}><Send size={20} /></button>
      </form>
    </section>
  );
}

function HandoffExecutionCard({
  title,
  result,
  liveEvents,
  error,
  running,
  disabled,
  model,
  onRun,
  onApprove,
  onReject,
}: {
  title: string;
  result?: OpenCodeRunResult;
  liveEvents?: OpenCodeRunEvent[];
  error?: string;
  running: boolean;
  disabled: boolean;
  model: string;
  onRun: () => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}) {
  const status = running ? 'running' : result?.status ?? (error ? 'blocked' : 'ready');
  const summary = error
    ? humanizeSummary(error)
    : result?.blocker
      ? humanizeSummary(result.blocker)
      : result?.summary
        ? humanizeSummary(result.summary)
        : 'Ready to hand this to the coding agent.';
  const allEvents = [...(liveEvents ?? []), ...(result?.events ?? [])]
    .filter((event) => event.status !== 'queued')
    .sort((a, b) => a.timestamp - b.timestamp);
  const uniqueEvents = allEvents.filter((event, index, list) => index === 0 || event.timestamp !== list[index - 1].timestamp || event.status !== list[index - 1].status || event.message !== list[index - 1].message);
  const visibleEvents = uniqueEvents.slice(-9);
  const displayTitle = title.replace(/^OpenCode handoff:\s*/i, '');
  const pendingFromLive = [...(liveEvents ?? [])]
    .sort((a, b) => a.timestamp - b.timestamp)
    .findLast((event) => event.status === 'awaiting_approval' && Boolean(event.approval))?.approval ?? null;
  const pendingApproval = result?.approval && status === 'awaiting_approval' ? result.approval : pendingFromLive;
  const finalSummary = summarizeActivity(result);
  const ready = !result && !running && !error;

  return (
    <div style={trailStyle} data-testid="opencode-execution-card">
      <div style={trailRequestStyle}>
        <span style={trailRequestLabelStyle}>CRON</span>
        <span style={trailRequestTextStyle}>{displayTitle}</span>
        {ready && (
          <button type="button" onClick={onRun} disabled={disabled} style={trailRunButtonStyle}>
            Run
          </button>
        )}
        {result?.status === 'failed' && (
          <button type="button" onClick={onRun} disabled={disabled} style={trailRunButtonStyle}>
            Retry
          </button>
        )}
      </div>

      {running && visibleEvents.length === 0 && (
        <TrailStep status="starting" index={0} label="Starting" message="Preparing the coding agent." />
      )}

      {visibleEvents.map((event, index) => {
        const human = humanizeEvent(event);
        return <TrailStep key={`${event.timestamp}-${event.status}-${index}`} index={index} status={event.status} label={human.status} message={human.message} />;
      })}

      {pendingApproval && (
        <div style={approvalInlineStyle} data-testid="inline-approval">
          <div style={approvalTextStyle}>
            <strong>Waiting for your approval</strong>
            <span>
              OpenCode wants to {pendingApproval.permission}:
              {pendingApproval.target ? ` ${pendingApproval.target}` : ' a file'}
            </span>
            <span style={approvalReasonStyle}>{pendingApproval.reason}</span>
          </div>
          <div style={approvalActionsStyle}>
            <button type="button" onClick={() => onApprove(pendingApproval.approvalId)} disabled={disabled} style={approveButtonStyle}>
              <Check size={14} /> Approve
            </button>
            <button type="button" onClick={() => onReject(pendingApproval.approvalId)} disabled={disabled} style={rejectButtonStyle}>
              Reject
            </button>
          </div>
        </div>
      )}

      {finalSummary?.status === 'completed' && (
        <div style={summaryBlockStyle} data-testid="final-summary">
          <div style={summaryDoneStyle}>
            <Check size={13} /> Completed
          </div>
          {finalSummary.created.length > 0 && (
            <div style={summaryRowStyle}>
              <span style={summaryKeyStyle}>Created:</span>
              <span style={summaryValueStyle}>{finalSummary.created.map((file) => file.split('/').pop()).join(', ')}</span>
            </div>
          )}
          <div style={summaryRowStyle}>
            <span style={summaryKeyStyle}>Checked:</span>
            <span style={summaryValueStyle}>{finalSummary.checked}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryKeyStyle}>Tests:</span>
            <span style={summaryValueStyle}>{finalSummary.tests}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryKeyStyle}>Changed files:</span>
            <span style={summaryValueStyle}>{finalSummary.changedCount}</span>
          </div>
        </div>
      )}

      {finalSummary && finalSummary.status !== 'completed' && finalSummary.status !== 'awaiting_approval' && (
        <div style={summaryBlockStyle} data-testid="final-summary">
          <div style={finalSummary.status === 'cancelled' ? summaryCancelledStyle : summaryFailedStyle}>
            {finalSummary.status === 'cancelled' ? 'Cancelled' : 'Failed'}
          </div>
          <div style={summaryRowStyle}>
            <span style={summaryValueStyle}>{finalSummary.headline}</span>
          </div>
        </div>
      )}

      {summary && status === 'blocked' && (
        <div style={trailNoteStyle}>{summary}</div>
      )}
      <div style={trailMetaStyle} data-testid="trail-meta">Executor: {friendlyModelName(model)}</div>
    </div>
  );
}

function TrailStep({ status, label, message, index = 0 }: { status: string; label: string; message: string; index?: number }) {
  return (
    <div style={trailStepStyle(index)} data-testid="activity-step">
      <span style={trailDotStyle(status)} />
      <div style={trailStepBodyStyle}>
        <span style={trailStepLabelStyle(status)}>{label}</span>
        <span style={trailStepMessageStyle}>{message}</span>
      </div>
    </div>
  );
}

function inferRoute(prompt: string, attachments: LlmAttachment[]): LlmRoute {
  if (attachments.some((file) => file.kind === 'image')) return 'local-vision';
  if (isGoSignal(prompt)) return 'opencode-flash';
  if (/\b(code|fix|bug|test|build|repo|file|component|implement|refactor|error|typescript|javascript|tsx|jsx|css|run|debug|failing|compile|lint|typecheck)\b/i.test(prompt)) {
    return 'opencode-flash';
  }
  return 'local-chat';
}

const workspaceStyle: CSSProperties = { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#eaf2ff', fontFamily: 'var(--cron-font-family)', background: 'rgba(3, 12, 28, 0.94)' };
const conversationHeaderStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', color: '#d9e8ff', fontSize: 12, flexShrink: 0, borderBottom: '1px solid var(--cron-surface-border)' };
const headerRightStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const mutedStyle: CSSProperties = { display: 'block', color: '#8da4c7', fontSize: 10, fontWeight: 400, marginTop: 2 };
const routeBadgeStyle: CSSProperties = { padding: '2px 6px', border: '1px solid rgba(100,160,255,.38)', color: '#a9c7f0', background: 'rgba(18,63,134,.28)', fontSize: 9, fontWeight: 700, letterSpacing: 1 };
const statusStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px 8px', color: '#8da4c7', fontSize: 10, borderBottom: '1px solid rgba(100,160,255,.12)', flexShrink: 0 };
const statusButtonStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, color: '#b7cdf0', fontSize: 10, whiteSpace: 'nowrap', border: 0, background: 'transparent', padding: '4px 0', cursor: 'pointer', fontFamily: 'var(--cron-font-family)' };
const messagesStyle: CSSProperties = { flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', padding: '12px 12px 26px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, boxSizing: 'border-box', scrollPaddingBottom: 28 };
const emptyStyle: CSSProperties = { margin: 'auto', color: '#9ab6de', fontSize: 14, textAlign: 'center', textShadow: '0 1px 14px #020917' };
const cronMessageStyle: CSSProperties = { alignSelf: 'flex-start', maxWidth: '88%', padding: '10px 12px', background: 'rgba(4, 20, 46, 0.86)', border: '1px solid rgba(100, 160, 255, 0.32)', borderRadius: '0 10px 10px 10px', boxShadow: '0 6px 20px rgba(0,0,0,.18)' };
/* Handoff/execution messages drop the boxed bubble so the activity trail reads
   as a conversation (one subtle rail) instead of a nested card in a card. */
const cronHandoffMessageStyle: CSSProperties = { alignSelf: 'stretch', maxWidth: '92%', padding: '6px 10px 2px 4px', background: 'transparent', border: 0, borderRadius: 0 };
const userMessageStyle: CSSProperties = { alignSelf: 'flex-end', maxWidth: '88%', padding: '10px 12px', background: 'rgba(16, 43, 86, 0.88)', border: '1px solid rgba(100, 160, 255, 0.38)', borderRadius: '10px 0 10px 10px', boxShadow: '0 6px 20px rgba(0,0,0,.18)' };
const messageLabelStyle: CSSProperties = { color: '#86adE8', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 5 };
const messageTextStyle: CSSProperties = { fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' };
const messageAttachmentStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, color: '#8da4c7', fontSize: 10 };
const thinkingStyle: CSSProperties = { color: '#8da4c7', fontSize: 12, fontStyle: 'italic' };
const attachmentRowStyle: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 12px', borderTop: '1px solid rgba(100,160,255,.18)', flexShrink: 0 };
const attachmentStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', background: 'rgba(18, 63, 134, .48)', border: '1px solid rgba(100,160,255,.3)', fontSize: 11, color: '#b7cdf0' };
const removeAttachmentStyle: CSSProperties = { display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: '#b7cdf0', cursor: 'pointer', padding: 0 };
const composerStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, margin: '0 10px max(18px, env(safe-area-inset-bottom))', padding: '8px 10px', background: 'rgba(2, 9, 23, 0.94)', border: '1px solid rgba(119, 165, 239, 0.48)', borderRadius: 4, boxShadow: '0 0 0 1px rgba(14, 45, 96, .3), 0 12px 40px rgba(0,0,0,.22)', flexShrink: 0, position: 'relative', zIndex: 2 };
const iconButtonStyle: CSSProperties = { display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: '#a9c7f0', cursor: 'pointer' };
const messageInputStyle: CSSProperties = { flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 0, color: '#edf5ff', fontFamily: 'var(--cron-font-family)', fontSize: 13, padding: '8px 2px' };
const sendButtonStyle: CSSProperties = { display: 'grid', placeItems: 'center', width: 34, height: 34, border: '1px solid #5d91e5', borderRadius: '50%', background: '#eaf2ff', color: '#0b2148', cursor: 'pointer' };

const trailStyle: CSSProperties = { position: 'relative', padding: '10px 0 2px 18px', borderLeft: '2px solid rgba(100,160,255,.35)', marginLeft: 6, display: 'grid', gap: 10 };
const trailRequestStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' };
const trailRequestLabelStyle: CSSProperties = { color: '#86ade8', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 };
const trailRequestTextStyle: CSSProperties = { color: '#eaf2ff', fontSize: 13, lineHeight: 1.45, overflowWrap: 'anywhere' };
const trailRunButtonStyle: CSSProperties = { border: '1px solid rgba(125,177,255,.52)', background: 'rgba(18,63,134,.48)', color: '#eaf2ff', cursor: 'pointer', borderRadius: 4, fontFamily: 'var(--cron-font-family)', fontSize: 11, padding: '4px 10px' };
const trailStepStyle: (index?: number) => CSSProperties = (index = 0) => ({
  position: 'relative',
  display: 'flex',
  gap: 10,
  alignItems: 'baseline',
  animation: 'cron-trail-reveal 260ms ease-out both',
  animationDelay: `${Math.min(index * 240, 1680)}ms`,
});
const trailStepBodyStyle: CSSProperties = { display: 'grid', gap: 2, minWidth: 0 };
const trailStepLabelStyle: (status: string) => CSSProperties = (status) => ({
  fontSize: 11,
  fontWeight: 700,
  color: status === 'completed' ? '#8bf0b7' : status === 'awaiting_approval' ? '#f4dfaa' : status === 'running' ? '#ffb3bc' : status === 'failed' || status === 'cancelled' ? '#ffb3bc' : '#b7cdf0',
});
const trailStepMessageStyle: CSSProperties = { color: '#c9dcf7', fontSize: 12, lineHeight: 1.45, overflowWrap: 'anywhere' };
const trailNoteStyle: CSSProperties = { color: '#9ab6de', fontSize: 12, lineHeight: 1.45 };
const trailMetaStyle: CSSProperties = { color: '#6f8db8', fontSize: 10 };
const approvalInlineStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', margin: '2px 0', padding: '10px 12px', border: '1px solid rgba(242,193,78,.45)', background: 'rgba(61, 41, 6, .24)', borderRadius: 8, color: '#f4dfaa', fontSize: 12, flexWrap: 'wrap' };
const approvalTextStyle: CSSProperties = { display: 'grid', gap: 3, minWidth: 0, flex: 1 };
const approvalReasonStyle: CSSProperties = { color: '#d8c48a', fontSize: 11 };
const approvalActionsStyle: CSSProperties = { display: 'flex', gap: 6, flexShrink: 0 };
const approveButtonStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(48,209,124,.58)', background: 'rgba(30, 103, 65, .5)', color: '#d9ffe9', cursor: 'pointer', borderRadius: 4, fontFamily: 'var(--cron-font-family)', fontSize: 11, padding: '5px 9px' };
const rejectButtonStyle: CSSProperties = { border: '1px solid rgba(255,96,116,.52)', background: 'rgba(92, 22, 34, .42)', color: '#ffd7dd', cursor: 'pointer', borderRadius: 4, fontFamily: 'var(--cron-font-family)', fontSize: 11, padding: '5px 9px' };
const summaryBlockStyle: CSSProperties = { display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 8, background: 'rgba(11, 40, 26, .30)', border: '1px solid rgba(48,209,124,.3)' };
const summaryDoneStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#8bf0b7', fontSize: 12, fontWeight: 700 };
const summaryCancelledStyle: CSSProperties = { color: '#ffd7dd', fontSize: 12, fontWeight: 700 };
const summaryFailedStyle: CSSProperties = { color: '#ffd7dd', fontSize: 12, fontWeight: 700 };
const summaryRowStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12, lineHeight: 1.4 };
const summaryKeyStyle: CSSProperties = { color: '#8da4c7', flexShrink: 0, fontWeight: 600 };
const summaryValueStyle: CSSProperties = { color: '#d9e8ff', overflowWrap: 'anywhere' };

function trailDotStyle(status: string): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 4,
    background: status === 'completed' ? '#30d17c' : status === 'awaiting_approval' ? '#f2c14e' : status === 'running' ? '#ff4d5f' : status === 'failed' || status === 'cancelled' ? '#ff6473' : '#6f8db8',
    boxShadow: status === 'running' ? '0 0 12px rgba(255, 77, 95, .85)' : status === 'awaiting_approval' ? '0 0 12px rgba(242, 193, 78, .6)' : 'none',
  };
}
