import { useState } from 'react'
import { Card, Empty, MonthSelect, Page, ProgressBar, SectionTitle, Segmented } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { useOpenSheet } from '../components/sheets'
import { allOperations, byCategory, inMonth, monthsOf, sum } from '../lib/calc'
import { catInfo, GROUPS } from '../lib/categories'
import { currentMonth, dayLabel, fmtMoney } from '../lib/format'
import { useStore } from '../lib/store'

type Kind = 'all' | 'expense' | 'income'

export default function Operations() {
  const { data } = useStore()
  const open = useOpenSheet()
  const months = monthsOf([...data.expenses, ...data.incomes], currentMonth())
  const [ym, setYm] = useState(months[0])
  const [kind, setKind] = useState<Kind>('all')
  const [cat, setCat] = useState('')

  const monthOps = allOperations(data).filter((o) => o.date.startsWith(ym))
  const list = monthOps.filter((o) =>
    (kind === 'all' || o.kind === kind) && (!cat || (o.kind === 'expense' && o.category === cat)))
  const income = sum(monthOps.filter((o) => o.kind === 'income'))
  const expense = sum(monthOps.filter((o) => o.kind === 'expense'))
  const monthExpenses = inMonth(data.expenses, ym)
  const top = byCategory(monthExpenses).slice(0, 5)
  const usedCats = [...new Set(monthExpenses.map((e) => e.category))]

  // группировка по дням
  const days: { date: string; items: typeof list }[] = []
  for (const o of list) {
    const last = days[days.length - 1]
    if (last?.date === o.date) last.items.push(o)
    else days.push({ date: o.date, items: [o] })
  }

  return (
    <Page title="Операции" action={<MonthSelect value={ym} options={months} onChange={(v) => { setYm(v); setCat('') }} />}>
      <div className="grid animate-rise grid-cols-2 gap-3">
        <div className="card !p-3.5">
          <p className="text-xs text-muted">Доходы</p>
          <p className="num text-2xl text-accent">+{fmtMoney(income)}</p>
        </div>
        <div className="card !p-3.5">
          <p className="text-xs text-muted">Расходы</p>
          <p className="num text-2xl">−{fmtMoney(expense)}</p>
        </div>
      </div>

      {top.length > 0 && (
        <Card delay={60}>
          <SectionTitle>Топ-5 категорий</SectionTitle>
          <ul className="space-y-3">
            {top.map((c) => {
              const info = catInfo(data.categories, c.name)
              const pct = expense > 0 ? (c.value / expense) * 100 : 0
              return (
                <li key={c.name}>
                  <button type="button" className="w-full text-left" onClick={() => { setKind('expense'); setCat(cat === c.name ? '' : c.name) }}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="truncate">{info.icon} {c.name}</span>
                      <span className="whitespace-nowrap"><span className="num">{fmtMoney(c.value)}</span> <span className="text-muted">{pct.toFixed(0)}%</span></span>
                    </div>
                    <ProgressBar value={c.value} max={expense} color={GROUPS[info.group].color} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="animate-rise space-y-2" style={{ animationDelay: '120ms' }}>
        <Segmented value={kind} onChange={(k) => { setKind(k); if (k === 'income') setCat('') }}
          options={[{ value: 'all', label: 'Все' }, { value: 'expense', label: 'Расходы' }, { value: 'income', label: 'Доходы' }]} />
        {kind !== 'income' && usedCats.length > 0 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            <button type="button" onClick={() => setCat('')} className={`chip shrink-0 ${!cat ? '!bg-accent !text-bg' : ''}`}>Все категории</button>
            {usedCats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={`chip shrink-0 ${cat === c ? '!bg-accent !text-bg' : ''}`}>{catInfo(data.categories, c).icon} {c}</button>
            ))}
          </div>
        )}
      </div>

      {days.length === 0 ? (
        <Card><Empty icon="🧾">Нет операций. Нажмите «+», чтобы добавить.</Empty></Card>
      ) : (
        days.map((d, i) => {
          const net = sum(d.items.filter((o) => o.kind === 'income')) - sum(d.items.filter((o) => o.kind === 'expense'))
          return (
            <Card key={d.date} delay={Math.min(i, 6) * 40 + 140} className="!py-2">
              <div className="flex items-center justify-between border-b border-line py-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted">{dayLabel(d.date)}</span>
                <span className={`num ${net >= 0 ? 'text-accent' : 'text-muted'}`}>{net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(net))}</span>
              </div>
              <ul className="divide-y divide-line">
                {d.items.map((o) => (
                  <OperationRow key={o.id} op={o} categories={data.categories}
                    onClick={() => open({ kind: 'operation', mode: o.kind, item: o })} />
                ))}
              </ul>
            </Card>
          )
        })
      )}
      <p className="text-center text-xs text-muted/70">Нажмите на операцию, чтобы изменить сумму, дату или удалить её</p>
    </Page>
  )
}
