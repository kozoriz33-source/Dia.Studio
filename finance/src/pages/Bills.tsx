import { Card, CatIcon, Empty, Page, ProgressBar, Badge } from '../components/ui'
import { useOpenSheet } from '../components/sheets'
import { billExpense, sum } from '../lib/calc'
import { catInfo } from '../lib/categories'
import { currentMonth, dayLabel, dueDate, fmtMoney, monthLabel, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'

const QUICK = [
  { name: 'Xbox Game Pass', category: 'Xbox' },
  { name: 'Netflix', category: 'Netflix' },
  { name: 'YouTube Premium', category: 'YouTube' },
  { name: 'Vodafone', category: 'Мобильный (Vodafone)' },
  { name: 'Интернет квартиры', category: 'Интернет квартиры' },
  { name: 'Квартира', category: 'Платёж за квартиру' },
  { name: 'Коммунальные', category: 'Коммунальные' },
  { name: 'Страховка машины', category: 'Страховка машины' },
]

export default function Bills() {
  const { data, dispatch } = useStore()
  const open = useOpenSheet()
  const ym = currentMonth()
  const today = todayISO()

  const rows = [...data.bills]
    .map((b) => ({ b, paid: billExpense(data, b, ym), date: dueDate(ym, b.day) }))
    .sort((x, y) => Number(!!x.paid) - Number(!!y.paid) || x.date.localeCompare(y.date))
  const total = sum(data.bills)
  const paid = sum(rows.filter((r) => r.paid).map((r) => r.paid!))
  const quick = QUICK.filter((q) => !data.bills.some((b) => b.category === q.category))

  const toggle = (r: (typeof rows)[number]) => {
    if (r.paid) dispatch({ type: 'deleteExpense', id: r.paid.id })
    else dispatch({ type: 'addExpense', item: { id: uid(), amount: r.b.amount, category: r.b.category, date: today, note: r.b.name, billId: r.b.id } })
  }

  return (
    <Page title="Платежи" action={<button type="button" className="btn !py-2 text-sm" onClick={() => open({ kind: 'bill' })}>+ Добавить</button>}>
      <Card>
        <p className="text-xs font-medium text-muted">Регулярные платежи · {monthLabel(ym)}</p>
        <div className="mb-3 mt-1 flex items-baseline justify-between">
          <span className="num text-4xl">{fmtMoney(total)}</span>
          <span className="text-sm text-muted">оплачено <span className="num text-accent">{fmtMoney(paid)}</span></span>
        </div>
        <ProgressBar value={paid} max={total} />
        <p className="mt-2 text-xs text-muted">Подписки, связь, квартира и страховка. Отметка «оплачено» сама добавит расход.</p>
      </Card>

      {rows.length === 0 ? (
        <Card><Empty icon="📅">Добавьте ежемесячные платежи, чтобы не забывать о них</Empty></Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => {
            const cat = catInfo(data.categories, r.b.category)
            const overdue = !r.paid && r.date < today
            return (
              <Card key={r.b.id} delay={i * 40} className={`!p-3 ${overdue ? 'ring-1 ring-warn/60' : ''} ${r.paid ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => open({ kind: 'bill', item: r.b })}>
                    <CatIcon cat={cat} size={44} />
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${r.paid ? 'line-through decoration-muted/60' : ''}`}>{r.b.name}</p>
                      <p className={`text-xs ${overdue ? 'text-warn' : 'text-muted'}`}>
                        {r.paid ? `Оплачено ${dayLabel(r.paid.date).toLowerCase()}` : `${dayLabel(r.date)} · каждое ${r.b.day} число`}
                      </p>
                      {overdue && <div className="mt-1"><Badge tone="warn">Просрочено</Badge></div>}
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="num text-lg">{fmtMoney(r.b.amount)}</span>
                    <button type="button" onClick={() => toggle(r)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition active:scale-95 ${r.paid ? 'bg-emerald-400/15 text-emerald-300' : overdue ? 'bg-warn text-white' : 'bg-accent text-bg'}`}>
                      {r.paid ? '✓ Оплачено' : 'Оплатить'}
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </ul>
      )}

      {quick.length > 0 && (
        <Card delay={120}>
          <p className="mb-2 text-xs font-medium text-muted">Быстро добавить</p>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q.name} type="button" className="chip" onClick={() => open({ kind: 'bill', preset: q })}>
                {catInfo(data.categories, q.category).icon} {q.name}
              </button>
            ))}
          </div>
        </Card>
      )}
    </Page>
  )
}
