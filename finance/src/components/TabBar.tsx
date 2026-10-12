import type { ReactNode } from 'react'
import type { TabId } from '../lib/types'
import { IconDashboard, IconDebt, IconExpense, IconIncome, IconLimit } from './icons'

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Главная', icon: <IconDashboard /> },
  { id: 'income', label: 'Доходы', icon: <IconIncome /> },
  { id: 'expenses', label: 'Расходы', icon: <IconExpense /> },
  { id: 'debts', label: 'Долги', icon: <IconDebt /> },
  { id: 'limits', label: 'Лимиты', icon: <IconLimit /> },
]

export default function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-panel/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((t) => {
          const on = t.id === active
          return (
            <li key={t.id} className="flex-1">
              <button type="button" onClick={() => onChange(t.id)} aria-current={on ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${on ? 'text-accent' : 'text-muted'}`}>
                <span className={on ? 'drop-shadow-[0_0_6px_rgba(2,210,227,.7)]' : ''}>{t.icon}</span>
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
