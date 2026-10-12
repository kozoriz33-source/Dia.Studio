import { useEffect, useState, type ReactNode } from 'react'
import { GROUPS } from '../lib/categories'
import type { Category } from '../lib/types'

export const Screen = ({ title, left, right, children }: { title: string; left?: ReactNode; right?: ReactNode; children: ReactNode }) => (
  <div className="space-y-4">
    <header className="flex animate-rise items-center gap-3 pt-1">
      {left}
      <h1 className="num flex-1 text-[24px] leading-tight">{title}</h1>
      {right}
    </header>
    {children}
  </div>
)

export const Card = ({
  children, delay = 0, className = '', onClick,
}: { children: ReactNode; delay?: number; className?: string; onClick?: () => void }) => {
  const cls = `card animate-rise ${onClick ? 'cursor-pointer transition active:scale-[.985]' : ''} ${className}`
  return onClick
    ? <section role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()} className={cls} style={{ animationDelay: `${delay}ms` }}>{children}</section>
    : <section className={cls} style={{ animationDelay: `${delay}ms` }}>{children}</section>
}

export const Head = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h2 className="text-[17px] font-bold">{children}</h2>
    {right}
  </div>
)

export const TextBtn = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="rounded-full px-1 text-sm font-semibold text-accent active:opacity-60">{children}</button>
)

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[13px] font-semibold text-ink2">{label}</span>
    {children}
  </label>
)

export const Empty = ({ icon, title, children }: { icon?: string; title?: string; children?: ReactNode }) => (
  <div className="px-2 py-6 text-center">
    {icon && <div className="mb-2 text-4xl">{icon}</div>}
    {title && <p className="font-semibold">{title}</p>}
    {children && <p className="mx-auto mt-1 max-w-[30ch] text-sm text-ink2">{children}</p>}
  </div>
)

export const Pill = ({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'warn' | 'ok' | 'accent' | 'dark' }) => {
  const cls = {
    soft: 'bg-soft text-ink2', warn: 'bg-warnSoft text-warn', ok: 'bg-okSoft text-ok',
    accent: 'bg-accentSoft text-accent', dark: 'bg-ink text-white',
  }[tone]
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${cls}`}>{children}</span>
}

export function Bar({ value, max, color = '#2F5BFF', warn, height = 8 }: { value: number; max: number; color?: string; warn?: boolean; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="overflow-hidden rounded-full bg-soft" style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: warn ? '#FF6B00' : color }} />
    </div>
  )
}

export function Segmented<T extends string>({
  options, value, onChange, dark,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; dark?: boolean }) {
  return (
    <div className={`flex rounded-2xl p-1 ${dark ? 'bg-white/10' : 'bg-soft'}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${on ? (dark ? 'bg-white text-ink' : 'bg-white text-ink shadow-card') : dark ? 'text-white/60' : 'text-ink2'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export const CatIcon = ({ cat, size = 42 }: { cat: Category; size?: number }) => {
  const color = GROUPS[cat.group].color
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[14px]"
      style={{ width: size, height: size, background: `${color}1A`, fontSize: size * 0.5 }}>
      {cat.icon}
    </span>
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
      className={`w-full rounded-2xl py-3.5 font-semibold transition active:scale-[.97] ${armed ? 'bg-warn text-white' : 'bg-warnSoft text-warn'}`}>
      {armed ? 'Нажмите ещё раз, чтобы удалить' : label}
    </button>
  )
}

/** Нижняя выдвижная панель */
export function Sheet({ title, onClose, children, flush }: { title?: string; onClose: () => void; children: ReactNode; flush?: boolean }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade bg-ink/40" onClick={onClose} />
      <div className={`relative flex max-h-[94%] w-full max-w-xl animate-sheet flex-col rounded-t-[28px] bg-white shadow-sheet ${flush ? '' : 'overflow-y-auto px-4'}`}
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto mb-1 mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" />
        {title && (
          <div className={`mb-3 flex items-center justify-between ${flush ? 'px-4' : ''}`}>
            <h2 className="text-xl font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Закрыть"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-ink2">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
