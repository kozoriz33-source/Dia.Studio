import { useState } from 'react'
import { Card, Empty, Screen, Segmented } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { useUI } from '../components/overlays'
import { allOperations, monthsOf, sum } from '../lib/calc'
import { catInfo } from '../lib/categories'
import { currentMonth, dayLabel, fmtMoney, monthLabel, weekdayShort } from '../lib/format'
import { useStore } from '../lib/store'

type Kind = 'all' | 'expense' | 'income'

export default function History() {
  const { data } = useStore()
  const { open } = useUI()
  const months = monthsOf([...data.expenses, ...data.incomes], currentMonth())
  const [ym, setYm] = useState(months[0])
  const [kind, setKind] = useState<Kind>('all')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')

  const monthOps = allOperations(data).filter((o) => o.date.startsWith(ym))
  const query = q.trim().toLowerCase()
  const list = monthOps.filter((o) => {
    if (kind !== 'all' && o.kind !== kind) return false
    if (cat && !(o.kind === 'expense' && o.category === cat)) return false
    if (query) {
      const hay = `${o.kind === 'expense' ? o.category : o.source} ${o.note}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
  const income = sum(monthOps.filter((o) => o.kind === 'income'))
  const expense = sum(monthOps.filter((o) => o.kind === 'expense'))
  const usedCats = [...new Set(monthOps.flatMap((o) => (o.kind === 'expense' ? [o.category] : [])))]

  const days: { date: string; items: typeof list }[] = []
  for (const o of list) {
    const last = days[days.length - 1]
    if (last?.date === o.date) last.items.push(o)
    else days.push({ date: o.date, items: [o] })
  }

  return (
    <Screen title="История">
      <div className="-mx-4 flex animate-rise gap-1.5 overflow-x-auto px-4">
        {months.map((m) => (
          <button key={m} type="button" onClick={() => { setYm(m); setCat('') }} className={`chip shrink-0 ${ym === m ? 'chip-on' : ''}`}>{monthLabel(m)}</button>
        ))}
      </div>

      <div className="grid animate-rise grid-cols-2 gap-3" style={{ animationDelay: '40ms' }}>
        <div className="card !p-3.5">
          <p className="text-[13px] font-medium text-ink2">Доходы</p>
          <p className="num text-[22px] text-ok">+{fmtMoney(income)}</p>
        </div>
        <div className="card !p-3.5">
          <p className="text-[13px] font-medium text-ink2">Расходы</p>
          <p className="num text-[22px]">−{fmtMoney(expense)}</p>
        </div>
      </div>

      <div className="animate-rise space-y-2" style={{ animationDelay: '80ms' }}>
        <input className="field !bg-white" placeholder="🔍 Поиск по категории или заметке" value={q} onChange={(e) => setQ(e.target.value)} />
        <Segmented value={kind} onChange={(k) => { setKind(k); if (k === 'income') setCat('') }}
          options={[{ value: 'all', label: 'Все' }, { value: 'expense', label: 'Расходы' }, { value: 'income', label: 'Доходы' }]} />
        {kind !== 'income' && usedCats.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            <button type="button" onClick={() => setCat('')} className={`chip shrink-0 ${!cat ? 'chip-on' : ''}`}>Все категории</button>
            {usedCats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={`chip shrink-0 ${cat === c ? 'chip-on' : ''}`}>
                {catInfo(data.categories, c).icon} {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {days.length === 0 ? (
        <Card><Empty icon="🧾" title="Здесь пусто">Нажмите «+» внизу, чтобы записать трату</Empty></Card>
      ) : (
        days.map((d, i) => {
          const net = sum(d.items.filter((o) => o.kind === 'income')) - sum(d.items.filter((o) => o.kind === 'expense'))
          return (
            <Card key={d.date} delay={Math.min(i, 6) * 30 + 100} className="!py-2">
              <div className="flex items-center justify-between border-b border-line py-2">
                <span className="text-[13px] font-bold">{dayLabel(d.date)} <span className="font-medium text-ink3">· {weekdayShort(d.date)}</span></span>
                <span className={`num text-[13px] ${net >= 0 ? 'text-ok' : 'text-ink2'}`}>{net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(net))}</span>
              </div>
              <ul className="divide-y divide-line">
                {d.items.map((o) => (
                  <OperationRow key={o.id} op={o} categories={data.categories} onClick={() => open({ kind: 'edit', op: o })} />
                ))}
              </ul>
            </Card>
          )
        })
      )}
      {days.length > 0 && <p className="text-center text-[13px] text-ink3">Нажмите на запись, чтобы изменить дату, сумму или удалить</p>}
    </Screen>
  )
}
