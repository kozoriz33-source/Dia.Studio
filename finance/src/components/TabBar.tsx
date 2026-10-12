import type { ReactNode } from 'react'
import type { TabId } from '../lib/types'
import { IconCalendar, IconCard, IconHome, IconList, IconPie } from './icons'

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Главная', icon: <IconHome /> },
  { id: 'operations', label: 'Операции', icon: <IconList /> },
  { id: 'bills', label: 'Платежи', icon: <IconCalendar /> },
  { id: 'debts', label: 'Кредиты', icon: <IconCard /> },
  { id: 'plan', label: 'План', icon: <IconPie /> },
]

export default function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[.06] bg-panel/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((t) => {
          const on = t.id === active
          return (
            <li key={t.id} className="flex-1">
              <button type="button" onClick={() => onChange(t.id)} aria-current={on ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors ${on ? 'text-accent' : 'text-muted/80'}`}>
                {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent shadow-glow" />}
                <span className={on ? 'drop-shadow-[0_0_8px_rgba(2,210,227,.8)]' : ''}>{t.icon}</span>
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
