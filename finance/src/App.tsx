import { useState } from 'react'
import TabBar from './components/TabBar'
import { SheetHost, useOpenSheet } from './components/sheets'
import { IconPlus } from './components/icons'
import Dashboard from './pages/Dashboard'
import Operations from './pages/Operations'
import Bills from './pages/Bills'
import Debts from './pages/Debts'
import Plan from './pages/Plan'
import Settings from './pages/Settings'
import type { TabId } from './lib/types'

export default function App() {
  return (
    <SheetHost>
      <Shell />
    </SheetHost>
  )
}

function Shell() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const open = useOpenSheet()
  const go = (t: TabId) => { setTab(t); window.scrollTo(0, 0) }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-32 pt-4">
      {/* key — перезапускает анимацию появления при смене вкладки */}
      <main key={tab}>
        {tab === 'dashboard' && <Dashboard go={go} />}
        {tab === 'operations' && <Operations />}
        {tab === 'bills' && <Bills />}
        {tab === 'debts' && <Debts />}
        {tab === 'plan' && <Plan />}
        {tab === 'settings' && <Settings back={() => go('dashboard')} />}
      </main>

      {tab !== 'settings' && (
        <button type="button" aria-label="Добавить операцию" onClick={() => open({ kind: 'operation', mode: 'expense' })}
          className="fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-bg shadow-hero transition active:scale-90"
          style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }}>
          <IconPlus />
        </button>
      )}
      <TabBar active={tab} onChange={go} />
    </div>
  )
}
