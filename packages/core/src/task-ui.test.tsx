import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ApprovalPanel } from './components/ApprovalPanel.js';
import { ExecutionPanel } from './components/ExecutionPanel.js';
import { createExecutionRecord } from '@cron-code/contracts';

afterEach(cleanup);

describe('ApprovalPanel', () => {
  it('shows pending approvals with command summary and approve/reject actions', () => {
    const approvals = [
      {
        id: 'appr_1',
        taskId: 'task_1',
        projectId: 'proj_1',
        status: 'requested' as const,
        actionCategory: 'execute' as const,
        description: 'Run repo.status',
        reason: null,
        requestedAt: 1,
        respondedAt: null,
        expiresAt: null,
        commandId: 'repo.status',
        cwd: 'C:/repo',
        commandSummary: 'git status --short',
        requester: 'cron',
        riskCategory: 'low' as const,
      },
    ];
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<ApprovalPanel approvals={approvals} onApprove={onApprove} onReject={onReject} />);
    expect(screen.getByText('git status --short')).toBeTruthy();
    expect(screen.getByText('1 pending')).toBeTruthy();
    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledWith('appr_1');
    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith('appr_1');
  });

  it('shows empty note when there are no pending approvals', () => {
    const resolved = [
      {
        id: 'appr_2',
        taskId: 'task_1',
        projectId: 'proj_1',
        status: 'approved' as const,
        actionCategory: 'execute' as const,
        description: 'Run repo.status',
        reason: null,
        requestedAt: 1,
        respondedAt: 2,
        expiresAt: null,
        commandId: 'repo.status',
        cwd: 'C:/repo',
        commandSummary: 'git status --short',
        requester: 'cron',
      },
    ];
    render(<ApprovalPanel approvals={resolved} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('No pending approvals.')).toBeTruthy();
  });
});

describe('ExecutionPanel', () => {
  it('shows an empty state when no executions exist', () => {
    render(<ExecutionPanel executions={[]} onCancel={vi.fn()} />);
    expect(screen.getByText(/No executions yet/)).toBeTruthy();
  });

  it('shows status, command, exit code and expandable stdout', () => {
    const execution = createExecutionRecord({
      id: 'exe_1',
      status: 'completed',
      commandId: 'repo.status',
      taskId: 'task_1',
      projectId: 'proj_1',
      approvalId: 'appr_1',
      cwd: 'C:/repo',
      executable: 'git',
      args: ['status', '--short'],
      displayCommand: 'git status --short',
      startedAt: 1000,
      endedAt: 1200,
      exitCode: 0,
      output: { stdout: 'M file.txt', stderr: '', truncated: false, redacted: false, stdoutBytes: 10, stderrBytes: 0, stdoutLines: 1, stderrLines: 0 },
    });
    render(<ExecutionPanel executions={[execution]} onCancel={vi.fn()} />);
    expect(screen.getByText('git status --short')).toBeTruthy();
    expect(screen.getByText('COMPLETED')).toBeTruthy();
    expect(screen.getByText('exit 0')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Expand execution'));
    expect(screen.getByText(/M file.txt/)).toBeTruthy();
  });

  it('shows a cancel button only while the execution is running', () => {
    const running = createExecutionRecord({
      id: 'exe_2',
      status: 'running',
      commandId: 'repo.status',
      taskId: 'task_1',
      projectId: 'proj_1',
      approvalId: 'appr_1',
      cwd: 'C:/repo',
      executable: 'git',
      args: ['status', '--short'],
      displayCommand: 'git status --short',
      startedAt: 1000,
      endedAt: null,
      exitCode: null,
    });
    const finished = createExecutionRecord({
      id: 'exe_3',
      status: 'completed',
      commandId: 'repo.status',
      taskId: 'task_1',
      projectId: 'proj_1',
      approvalId: 'appr_1',
      cwd: 'C:/repo',
      executable: 'git',
      args: ['status', '--short'],
      displayCommand: 'git status --short',
      startedAt: 1000,
      endedAt: 1200,
      exitCode: 0,
    });
    const onCancel = vi.fn();
    const { rerender } = render(<ExecutionPanel executions={[running]} onCancel={onCancel} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledWith('exe_2');
    rerender(<ExecutionPanel executions={[finished]} onCancel={onCancel} />);
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('surfaces timeout and error notes', () => {
    const timedOut = createExecutionRecord({
      id: 'exe_4',
      status: 'timed_out',
      commandId: 'project.test',
      taskId: 'task_1',
      projectId: 'proj_1',
      approvalId: 'appr_1',
      cwd: 'C:/repo',
      executable: 'node',
      args: ['x'],
      displayCommand: 'pnpm -r test',
      startedAt: 1000,
      endedAt: 1300,
      exitCode: null,
      timeout: { timeoutMs: 300, exceeded: true },
      error: { code: 'TIMEOUT', message: 'Exceeded 300ms timeout' },
    });
    render(<ExecutionPanel executions={[timedOut]} onCancel={vi.fn()} />);
    expect(screen.getByText(/Timed out after 300ms/)).toBeTruthy();
    expect(screen.getByText(/Exceeded 300ms timeout/)).toBeTruthy();
  });
});
