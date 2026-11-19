import { AnimatePresence, motion } from 'framer-motion'
import { Star, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Stars({ value, size = 22, animate = false }: { value: number; size?: number; animate?: boolean }) {
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`${value} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={animate ? { scale: 0, rotate: -40 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: animate ? 0.3 + i * 0.25 : 0, type: 'spring', stiffness: 260, damping: 14 }}
        >
          <Star size={size} className={i < value ? 'fill-accent text-accent' : 'fill-line text-line'} strokeWidth={1.5} />
        </motion.span>
      ))}
    </span>
  )
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  color = '#7557F6',
  track = '#ECE8FF',
  children,
  label,
}: {
  value: number | null
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  label: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Bar({ value, color = '#7557F6', className = '', label }: { value: number; color?: string; className?: string; label?: string }) {
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-primary-soft ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="bcard max-h-[90dvh] w-full max-w-md overflow-y-auto p-6 outline-none"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-primary-soft" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Empty({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-5xl" aria-hidden>
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-muted">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold sm:text-2xl">{children}</h2>
      {action}
    </div>
  )
}

export const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐧', '🐨', '🦉', '🐲', '🤖', '👾', '🧑‍🚀', '🦸']
