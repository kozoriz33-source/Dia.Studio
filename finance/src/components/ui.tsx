import { useState, type ReactNode } from 'react'
import { monthLabel } from '../lib/format'
import { IconTrash } from './icons'

export const Page = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-4">
    <h1 className="num animate-rise text-2xl">{title}</h1>
    {children}
  </div>
)

/** Блок с анимацией появления; delay — ступенчатая задержка в мс */
export const Card = ({
  children, delay = 0, className = '',
}: { children: ReactNode; delay?: number; className?: string }) => (
  <section className={`card animate-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
    {children}
  </section>
)

export const SectionTitle = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between">
    <h2 className="num text-sm text-muted">{children}</h2>
    {right}
  </div>
)

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-xs text-muted">{label}</span>
    {children}
  </label>
)

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="py-6 text-center text-sm text-muted">{children}</p>
)

export const Badge = ({ children, warn }: { children: ReactNode; warn?: boolean }) => (
  <span className={`num rounded-full px-2 py-0.5 text-[11px] ${warn ? 'bg-warn/20 text-warn' : 'bg-accent/15 text-accent'}`}>
    {children}
  </span>
)

export function ProgressBar({ value, max, warn }: { value: number; max: number; warn?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-panel2">
      <div
        className={`h-full rounded-full transition-all duration-700 ${warn ? 'bg-warn' : 'bg-accent shadow-glow'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export const MonthSelect = ({
  value, options, onChange,
}: { value: string; options: string[]; onChange: (v: string) => void }) => (
  <select className="field !w-auto !py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
  </select>
)

/** Сворачиваемая форма добавления */
export function AddPanel({ title, children }: { title: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="num text-sm text-accent">{title}</span>
        <span className={`text-2xl leading-none text-accent transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <div className="mt-4 animate-rise">{children(() => setOpen(false))}</div>}
    </Card>
  )
}

export const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label="Удалить" className="p-1 text-muted/60 active:text-warn">
    <span className="block scale-75"><IconTrash /></span>
  </button>
)
