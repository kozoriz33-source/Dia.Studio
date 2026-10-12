import { useState } from 'react'
import TabBar from './components/TabBar'
import Dashboard from './pages/Dashboard'
import Incomes from './pages/Incomes'
import Expenses from './pages/Expenses'
import Debts from './pages/Debts'
import Limits from './pages/Limits'
import type { TabId } from './lib/types'

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard')
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
      {/* key — перезапускает анимацию появления при смене вкладки */}
      <main key={tab}>
        {tab === 'dashboard' && <Dashboard go={setTab} />}
        {tab === 'income' && <Incomes />}
        {tab === 'expenses' && <Expenses />}
        {tab === 'debts' && <Debts />}
        {tab === 'limits' && <Limits />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
