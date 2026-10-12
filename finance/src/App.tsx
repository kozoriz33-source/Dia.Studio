import { useState } from 'react'
import TabBar from './components/TabBar'
import { OverlayHost, useUI } from './components/overlays'
import Home from './pages/Home'
import Months from './pages/Months'
import Payments from './pages/Payments'
import Plan from './pages/Plan'
import Settings from './pages/Settings'
import type { TabId } from './lib/types'

export default function App() {
  return (
    <OverlayHost>
      <Shell />
    </OverlayHost>
  )
}

function Shell() {
  const [tab, setTab] = useState<TabId>('home')
  const { open } = useUI()
  const go = (t: TabId) => { setTab(t); window.scrollTo(0, 0) }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-32 pt-3">
      {/* key — перезапускает анимацию появления при смене вкладки */}
      <main key={tab}>
        {tab === 'home' && <Home go={go} />}
        {tab === 'months' && <Months />}
        {tab === 'payments' && <Payments />}
        {tab === 'plan' && <Plan />}
        {tab === 'settings' && <Settings back={() => go('home')} />}
      </main>
      <TabBar active={tab} onChange={go} onAdd={() => open({ kind: 'quick' })} />
    </div>
  )
}
