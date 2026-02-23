import { useState } from 'react'
import {
  Play,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Pencil,
  X,
  Check,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GlassButton } from '../common'
import { getScheduledTasks, updateScheduledTask, runTask, getTaskLogs } from '../../api/settings'
import type { ScheduledTask, TaskLog } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASK_LABELS: Record<string, string> = {
  fetch_feeds: 'Fetch Feeds',
  daily_digest: 'Daily Digest',
  weekly_digest: 'Weekly Digest',
  monthly_digest: 'Monthly Digest',
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}

function ToggleSwitch({ checked, onChange, disabled, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-blue-600' : 'bg-white/15',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block w-4 h-4 rounded-full bg-white shadow-sm',
          'transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
        aria-hidden="true"
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Log status badge
// ---------------------------------------------------------------------------

function LogStatusBadge({ status }: { status: TaskLog['status'] }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <CheckCircle2 size={12} aria-hidden="true" />
        <span className="text-xs">Success</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-red-400">
      <XCircle size={12} aria-hidden="true" />
      <span className="text-xs">Failed</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Inline cron editor
// ---------------------------------------------------------------------------

interface CronEditorProps {
  taskId: number
  current?: string
  onDone: () => void
}

function CronEditor({ taskId, current, onDone }: CronEditorProps) {
  const [value, setValue] = useState(current ?? '')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      updateScheduledTask(taskId, { cron_expression: value.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
      toast.success('Schedule updated')
      onDone()
    },
  })

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="*/30 * * * *"
        className={[
          'flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5',
          'text-white placeholder:text-white/30 text-xs font-mono',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40',
        ].join(' ')}
        aria-label="Cron expression"
        autoFocus
      />
      <button
        onClick={() => mutate()}
        disabled={isPending}
        aria-label="Save cron expression"
        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Check size={14} aria-hidden="true" />
        )}
      </button>
      <button
        onClick={onDone}
        aria-label="Cancel editing"
        className="p-1.5 rounded-lg text-white/40 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task logs panel
// ---------------------------------------------------------------------------

function TaskLogsPanel({ taskId }: { taskId: number }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['task-logs', taskId],
    queryFn: () => getTaskLogs(taskId, 10),
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-white/40">
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        Loading logs...
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <p className="text-sm text-white/30 py-4 text-center">No run history yet</p>
    )
  }

  return (
    <div className="mt-3 space-y-1.5" role="list" aria-label="Recent task logs">
      {logs.map((log) => (
        <div
          key={log.id}
          role="listitem"
          className="flex items-start gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs"
        >
          <LogStatusBadge status={log.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 text-white/40">
              <span>{formatDate(log.started_at)}</span>
              <span>→ {formatDate(log.finished_at)}</span>
            </div>
            {log.message && log.status === 'failed' && (
              <p className="mt-0.5 text-red-400/80 truncate" title={log.message}>
                {log.message}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single task row
// ---------------------------------------------------------------------------

function TaskRow({ task }: { task: ScheduledTask }) {
  const [expanded, setExpanded] = useState(false)
  const [editingCron, setEditingCron] = useState(false)
  const [running, setRunning] = useState(false)
  const queryClient = useQueryClient()

  const taskLabel = TASK_LABELS[task.task_type] ?? task.task_type

  const { mutate: toggleEnabled, isPending: toggling } = useMutation({
    mutationFn: (enable: boolean) =>
      updateScheduledTask(task.id, { is_enabled: enable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
  })

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const result = await runTask(task.id)
      if (result.success) {
        toast.success(`Task "${taskLabel}" executed`)
        queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
        queryClient.invalidateQueries({ queryKey: ['task-logs', task.id] })
      } else {
        toast.error(result.message ?? 'Failed to run task')
      }
    } catch {
      // axios interceptor handles the toast
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="border border-white/8 rounded-2xl overflow-hidden transition-colors hover:border-white/12">
      <div className="flex items-center gap-4 px-5 py-4 backdrop-blur-sm bg-white/5">
        <ToggleSwitch
          checked={task.is_enabled}
          onChange={(val) => toggleEnabled(val)}
          disabled={toggling}
          ariaLabel={`${task.is_enabled ? 'Disable' : 'Enable'} ${taskLabel}`}
        />

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white/85">{taskLabel}</span>

          {editingCron ? (
            <CronEditor
              taskId={task.id}
              current={task.cron_expression}
              onDone={() => setEditingCron(false)}
            />
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={11} className="text-white/30 shrink-0" aria-hidden="true" />
              <span className="text-xs text-white/40 font-mono">
                {task.cron_expression}
              </span>
              <button
                onClick={() => setEditingCron(true)}
                aria-label="Edit schedule"
                className="ml-1 p-0.5 rounded text-white/20 hover:text-white/60 transition-colors cursor-pointer"
              >
                <Pencil size={10} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="hidden sm:block text-right shrink-0">
          <p className="text-xs text-white/35">Last run</p>
          <p className="text-xs text-white/55 mt-0.5">{formatDate(task.last_run_at)}</p>
        </div>

        <GlassButton
          variant="secondary"
          size="sm"
          loading={running}
          icon={<Play size={13} aria-hidden="true" />}
          onClick={handleRunNow}
          aria-label={`Run ${taskLabel} now`}
        >
          Run
        </GlassButton>

        <button
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide logs' : 'Show logs'}
          className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
        >
          {expanded
            ? <ChevronUp size={16} aria-hidden="true" />
            : <ChevronDown size={16} aria-hidden="true" />
          }
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-white/5">
          <div className="flex items-center justify-between pt-3 mb-1">
            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              Recent Runs
            </h4>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['task-logs', task.id] })
              }
              aria-label="Refresh logs"
              className="p-1 rounded text-white/25 hover:text-white/50 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} aria-hidden="true" />
            </button>
          </div>
          <TaskLogsPanel taskId={task.id} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SchedulerConfig() {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: getScheduledTasks,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 border border-white/8 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
        <XCircle size={16} aria-hidden="true" />
        Failed to load scheduled tasks
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <p className="text-sm text-white/40 py-8 text-center">
        No scheduled tasks configured
      </p>
    )
  }

  return (
    <div className="space-y-3" role="list" aria-label="Scheduled tasks">
      {tasks.map((task) => (
        <div key={task.id} role="listitem">
          <TaskRow task={task} />
        </div>
      ))}
    </div>
  )
}
