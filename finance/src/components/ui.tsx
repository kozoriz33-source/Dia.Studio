import { useEffect, useState, type ReactNode } from 'react'
import { monthLabel, shiftDays, todayISO } from '../lib/format'
import { GROUPS, GROUP_ORDER } from '../lib/categories'
import type { Category } from '../lib/types'

export const Page = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <div className="space-y-4">
    <header className="flex animate-rise items-center justify-between">
      <h1 className="num text-[28px] leading-none">{title}</h1>
      {action}
    </header>
    {children}
  </div>
)

/** Блок с анимацией появления; delay — ступенчатая задержка в мс */
export const Card = ({
  children, delay = 0, className = '', onClick,
}: { children: ReactNode; delay?: number; className?: string; onClick?: () => void }) => (
  <section onClick={onClick} className={`card animate-rise ${onClick ? 'cursor-pointer active:scale-[.99] transition' : ''} ${className}`}
    style={{ animationDelay: `${delay}ms` }}>
    {children}
  </section>
)

export const SectionTitle = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h2 className="num text-[13px] tracking-[.08em] text-muted">{children}</h2>
    {right}
  </div>
)

export const LinkBtn = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="text-sm font-medium text-accent active:opacity-60">{children}</button>
)

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    {children}
  </label>
)

export const Empty = ({ icon, children }: { icon?: string; children: ReactNode }) => (
  <div className="py-6 text-center text-sm text-muted">
    {icon && <div className="mb-2 text-3xl">{icon}</div>}
    {children}
  </div>
)

export const Badge = ({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'warn' | 'ok' }) => {
  const cls = { accent: 'bg-accent/15 text-accent', warn: 'bg-warn/20 text-warn', ok: 'bg-emerald-400/15 text-emerald-300' }[tone]
  return <span className={`num whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] tracking-wider ${cls}`}>{children}</span>
}

export function ProgressBar({ value, max, warn, color }: { value: number; max: number; warn?: boolean; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-panel2">
      <div className={`h-full rounded-full transition-all duration-700 ${warn ? 'bg-warn' : color ? '' : 'bg-accent'}`}
        style={{ width: `${pct}%`, ...(color && !warn && { background: color }) }} />
    </div>
  )
}

export const MonthSelect = ({
  value, options, onChange,
}: { value: string; options: string[]; onChange: (v: string) => void }) => (
  <select className="field !w-auto !py-1.5 !text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
  </select>
)

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-panel2 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${o.value === value ? 'bg-accent text-bg shadow-glow' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const CatIcon = ({ cat, size = 40 }: { cat: Category; size?: number }) => {
  const color = GROUPS[cat.group].color
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}40`, fontSize: size * 0.48 }}>
      {cat.icon}
    </span>
  )
}

/** Выбор категории: сгруппированные плитки с иконками */
export function CategoryPicker({
  categories, value, onChange,
}: { categories: Category[]; value: string; onChange: (name: string) => void }) {
  return (
    <div className="space-y-3">
      {GROUP_ORDER.map((g) => {
        const list = categories.filter((c) => c.group === g)
        if (!list.length) return null
        return (
          <div key={g}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: GROUPS[g].color }}>{GROUPS[g].label}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((c) => {
                const on = c.name === value
                return (
                  <button key={c.name} type="button" onClick={() => onChange(c.name)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-transparent text-bg' : 'border-line bg-panel2 text-white'}`}
                    style={on ? { background: GROUPS[g].color } : undefined}>
                    <span>{c.icon}</span>{c.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const AmountInput = ({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) => (
  <input className="num w-full rounded-2xl border border-line bg-panel2 px-4 py-3 text-center text-4xl text-white outline-none placeholder:text-muted/30 focus:border-accent"
    inputMode="decimal" placeholder="0" value={value} autoFocus={autoFocus}
    onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />
)

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = todayISO()
  const quick = [{ v: t, l: 'Сегодня' }, { v: shiftDays(t, -1), l: 'Вчера' }]
  return (
    <div className="flex gap-2">
      {quick.map((q) => (
        <button key={q.l} type="button" onClick={() => onChange(q.v)}
          className={`rounded-xl px-3 text-sm font-medium transition ${value === q.v ? 'bg-accent text-bg' : 'bg-panel2 text-muted'}`}>
          {q.l}
        </button>
      ))}
      <input className="field flex-1" type="date" required value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

/** Кнопка удаления с подтверждением вторым нажатием (confirm() в артефактах не работает) */
export function DeleteButton({ onDelete, label = 'Удалить' }: { onDelete: () => void; label?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button type="button" onClick={() => (armed ? onDelete() : setArmed(true))}
      className={`w-full rounded-xl py-3 font-semibold transition active:scale-95 ${armed ? 'bg-warn text-white' : 'bg-warn/10 text-warn'}`}>
      {armed ? 'Нажмите ещё раз для удаления' : label}
    </button>
  )
}

/** Нижняя выдвижная панель */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92%] w-full max-w-xl animate-sheet overflow-y-auto rounded-t-3xl border-t border-white/10 bg-panel px-4 pt-3"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-panel2" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="num text-xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-panel2 text-lg text-muted">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
