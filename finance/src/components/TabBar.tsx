import type { ReactNode } from 'react'
import type { TabId } from '../lib/types'
import { IconCalendar, IconHistory, IconHome, IconPlus, IconTarget } from './icons'

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Главная', icon: <IconHome /> },
  { id: 'months', label: 'Месяцы', icon: <IconHistory /> },
  { id: 'payments', label: 'Обязательные', icon: <IconCalendar /> },
  { id: 'plan', label: 'План', icon: <IconTarget /> },
]

export default function TabBar({ active, onChange, onAdd }: { active: TabId; onChange: (t: TabId) => void; onAdd: () => void }) {
  const Tab = ({ t }: { t: (typeof tabs)[number] }) => {
    const on = t.id === active
    return (
      <button type="button" onClick={() => onChange(t.id)} aria-current={on ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2.5 text-[11px] font-semibold transition-colors ${on ? 'text-ink' : 'text-ink3'}`}>
        {t.icon}
        {t.label}
      </button>
    )
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex max-w-xl items-end px-2">
        <Tab t={tabs[0]} />
        <Tab t={tabs[1]} />
        <div className="flex flex-1 justify-center">
          <button type="button" onClick={onAdd} aria-label="Добавить трату"
            className="-mt-6 mb-1 flex h-[60px] w-[60px] items-center justify-center rounded-[22px] bg-ink text-white shadow-float transition active:scale-90">
            <IconPlus />
          </button>
        </div>
        <Tab t={tabs[2]} />
        <Tab t={tabs[3]} />
      </div>
    </nav>
  )
}
