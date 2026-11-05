import { ReactNode, ButtonHTMLAttributes, Component, ErrorInfo } from 'react'
import { Loader2, Inbox, CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react'
import { useApp } from '../lib/store'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallbackText?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ResQRoute ErrorBoundary caught]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl bg-white border border-[#DC3545]/30 text-[#171717] max-w-xl mx-auto my-8 shadow-sm">
          <div className="flex items-center gap-3 text-[#DC3545] mb-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-base text-[#171717]">View Recovery Safeguard Active</h3>
          </div>
          <p className="text-xs text-[#666666] leading-relaxed mb-3">
            {this.props.fallbackText || 'A data condition occurred. The interface recovered safely to prevent disruption.'}
          </p>
          {this.state.error && (
            <div className="text-[11px] font-mono p-3 rounded-lg bg-[#F7F8FA] text-[#DC3545] border border-[#E2E8F0] mb-4 max-h-24 overflow-y-auto">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm cursor-pointer flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore & Re-render</span>
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const STATUS: Record<string, string> = {
  suspected: 'bg-[#FDF9F0] text-[#D69E36] border border-[#D69E36]/30',
  confirmed: 'bg-[#FDF2F2] text-[#DC3545] border border-[#DC3545]/30 font-semibold',
  dispatching: 'bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30',
  en_route: 'bg-[#EBF2FA] text-[#356FA5] border border-[#356FA5]/30',
  on_scene: 'bg-[#F0F4F8] text-[#173B68] border border-[#CBD5E1]',
  assessed: 'bg-[#F0F4F8] text-[#173B68] border border-[#CBD5E1]',
  transporting: 'bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30',
  at_hospital: 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/30',
  completed: 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/30',
  rejected: 'bg-[#F7F8FA] text-[#666666] border border-[#E2E8F0]',
  no_ambulance: 'bg-[#DC3545] text-white border border-[#DC3545]',
  offered: 'bg-[#FDF9F0] text-[#D69E36] border border-[#D69E36]/40 font-semibold',
  available: 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/30',
  busy: 'bg-[#FDF2F2] text-[#DC3545] border border-[#DC3545]/30',
  offline: 'bg-[#F7F8FA] text-[#666666] border border-[#E2E8F0]',
  maintenance: 'bg-[#FDF9F0] text-[#D69E36] border border-[#D69E36]/30',
  declined: 'bg-[#F7F8FA] text-[#666666] border border-[#E2E8F0]',
  cancelled: 'bg-[#F7F8FA] text-[#666666] border border-[#E2E8F0]',
  receiving: 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/30',
  diverted: 'bg-[#FDF2F2] text-[#DC3545] border border-[#DC3545]/30',
  pending_verification: 'bg-[#FDF9F0] text-[#D69E36] border border-[#D69E36]/40 font-semibold',
  verified: 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/30 font-semibold',
}

export const Badge = ({ s, children }: { s: string; children?: ReactNode }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
      STATUS[s] ?? 'bg-[#F7F8FA] text-[#666666] border border-[#E2E8F0]'
    }`}
  >
    {children ?? s.replace(/_/g, ' ')}
  </span>
)

export const Card = ({
  title,
  right,
  children,
  className = '',
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <section className={`bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden ${className}`}>
    {title && (
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFBFD]">
        <h3 className="font-semibold text-[#171717] text-sm sm:text-base tracking-tight">{title}</h3>
        {right}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
)

type BP = ButtonHTMLAttributes<HTMLButtonElement> & {
  v?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'warn' | 'cyan'
  busy?: boolean
}

export const Btn = ({ v = 'primary', busy, children, className = '', ...p }: BP) => {
  const c = {
    primary: 'bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm',
    secondary: 'bg-[#356FA5] hover:bg-[#295986] text-white shadow-sm',
    cyan: 'bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm',
    danger: 'bg-[#DC3545] hover:bg-[#BB2D3B] text-white shadow-sm',
    success: 'bg-[#198754] hover:bg-[#146C43] text-white shadow-sm',
    warn: 'bg-[#D69E36] hover:bg-[#B88528] text-white shadow-sm',
    ghost: 'bg-white hover:bg-[#F7F8FA] text-[#171717] border border-[#E2E8F0] hover:border-[#CBD5E1]',
  }[v]

  return (
    <button
      {...p}
      disabled={p.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${c} ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  )
}

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 text-[#356FA5] p-8 font-medium">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span className="text-xs text-[#666666]">{label}</span>
  </div>
)

export const Empty = ({ text, hint }: { text: string; hint?: string }) => (
  <div className="text-center text-[#666666] py-10 space-y-1">
    <Inbox className="w-8 h-8 mx-auto mb-2 text-[#94A3B8]" />
    <div className="font-semibold text-[#171717] text-sm">{text}</div>
    {hint && <div className="text-xs text-[#666666]">{hint}</div>}
  </div>
)

export const Alert = ({
  kind = 'warn',
  children,
}: {
  kind?: 'warn' | 'error' | 'info' | 'ok'
  children: ReactNode
}) => {
  const m = {
    warn: 'bg-[#FDF9F0] border-[#D69E36]/30 text-[#855B14]',
    error: 'bg-[#FDF2F2] border-[#DC3545]/30 text-[#991B1B]',
    info: 'bg-[#EBF2FA] border-[#356FA5]/30 text-[#173B68]',
    ok: 'bg-[#F0F9F4] border-[#198754]/30 text-[#166534]',
  }[kind]
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm flex gap-3 ${m}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-current" />
      <div className="flex-1 text-xs leading-relaxed">{children}</div>
    </div>
  )
}

export const DemoNote = ({ children }: { children?: ReactNode }) => (
  <p className="text-xs text-[#666666]">
    {children ?? 'Operational Environment: routes, telemetry, and hospital bed updates are coordinated dynamically in real-time.'}
  </p>
)
export const SystemNote = DemoNote

export const Stat = ({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: ReactNode
  color: string
  icon: ReactNode
}) => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-sm">
    <div className={`w-11 h-11 rounded-lg grid place-items-center text-white shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-2xl font-bold text-[#171717] tracking-tight">{value}</div>
      <div className="text-xs text-[#666666] truncate">{label}</div>
    </div>
  </div>
)

export function Toasts() {
  const { toasts } = useApp()
  const ic: any = {
    success: <CheckCircle2 className="w-4 h-4 text-[#198754] shrink-0" />,
    error: <XCircle className="w-4 h-4 text-[#DC3545] shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#D69E36] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#356FA5] shrink-0" />,
  }
  return (
    <div className="fixed top-4 right-4 z-[3000] space-y-2.5 w-80 max-w-[90vw]">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-slide-in bg-white border border-[#E2E8F0] shadow-lg rounded-xl p-3.5 text-xs text-[#171717] flex gap-2.5 items-start"
        >
          {ic[t.level] ?? ic.info}
          <span className="flex-1 leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export const useAct = () => {
  const { push, refresh } = useApp()
  return async (fn: () => Promise<any>, ok?: string) => {
    try {
      const r = await fn()
      if (ok) push('success', ok)
      refresh()
      return r
    } catch (e: any) {
      push('error', e.message)
      return null
    }
  }
}
