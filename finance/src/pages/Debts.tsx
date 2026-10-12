import { Badge, Card, CatIcon, Empty, Page, ProgressBar } from '../components/ui'
import { useOpenSheet } from '../components/sheets'
import { isOverdue } from '../lib/calc'
import { catInfo } from '../lib/categories'
import { dayLabel, fmtMoney, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'

const QUICK = [
  { name: 'Кредит за телефон', category: 'Кредит за телефон' },
  { name: 'Кредит за машину', category: 'Кредит за машину' },
  { name: 'Кредитка', category: 'Кредитка' },
]

export default function Debts() {
  const { data, dispatch } = useStore()
  const open = useOpenSheet()
  const active = data.debts.filter((d) => d.remaining > 0)
  const totalLeft = active.reduce((s, d) => s + d.remaining, 0)
  const monthly = active.reduce((s, d) => s + Math.min(d.monthlyPayment, d.remaining), 0)
  const quick = QUICK.filter((q) => !data.debts.some((d) => d.category === q.category))

  return (
    <Page title="Кредиты" action={<button type="button" className="btn !py-2 text-sm" onClick={() => open({ kind: 'debt' })}>+ Добавить</button>}>
      <Card className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted">Осталось выплатить</p>
          <p className="num text-3xl">{fmtMoney(totalLeft)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Платежи в месяц</p>
          <p className="num text-3xl text-[#a78bfa]">{fmtMoney(monthly)}</p>
        </div>
      </Card>

      {data.debts.length === 0 && <Card><Empty icon="🎉">Кредитов нет</Empty></Card>}

      <ul className="space-y-3">
        {data.debts.map((d, i) => {
          const overdue = isOverdue(d)
          const closed = d.remaining <= 0
          const paidPct = d.total > 0 ? Math.round(((d.total - d.remaining) / d.total) * 100) : 0
          const monthsLeft = d.monthlyPayment > 0 ? Math.ceil(d.remaining / d.monthlyPayment) : 0
          return (
            <Card key={d.id} delay={i * 60} className={overdue ? 'ring-1 ring-warn/60' : ''}>
              <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => open({ kind: 'debt', item: d })}>
                <CatIcon cat={catInfo(data.categories, d.category)} size={46} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold">{d.name}</h3>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {overdue && <Badge tone="warn">Просрочено</Badge>}
                    {closed ? <Badge tone="ok">Погашено</Badge> : <span className="text-xs text-muted">ещё ≈ {monthsLeft} мес.</span>}
                  </div>
                </div>
                <span className="text-xs text-muted">Изменить</span>
              </button>

              <div className="my-4 grid grid-cols-3 gap-2">
                <Info label="Остаток" value={fmtMoney(d.remaining)} warn={overdue} big />
                <Info label="В месяц" value={fmtMoney(d.monthlyPayment)} />
                <Info label="Платёж" value={closed ? '—' : dayLabel(d.nextPaymentDate)} warn={overdue} />
              </div>

              <ProgressBar value={d.total - d.remaining} max={d.total} color="#a78bfa" warn={overdue} />
              <p className="mt-1.5 text-xs text-muted">Выплачено {paidPct}% из {fmtMoney(d.total)}</p>

              {!closed && (
                <button type="button" className={`mt-3 w-full ${overdue ? 'btn !bg-warn !text-white !shadow-none' : 'btn'}`}
                  onClick={() => dispatch({ type: 'payDebt', id: d.id, expenseId: uid(), date: todayISO() })}>
                  Внести платёж {fmtMoney(Math.min(d.monthlyPayment, d.remaining))}
                </button>
              )}
            </Card>
          )
        })}
      </ul>

      {quick.length > 0 && (
        <Card delay={120}>
          <p className="mb-2 text-xs font-medium text-muted">Быстро добавить</p>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q.name} type="button" className="chip" onClick={() => open({ kind: 'debt', preset: q })}>
                {catInfo(data.categories, q.category).icon} {q.name}
              </button>
            ))}
          </div>
        </Card>
      )}
      <p className="text-center text-xs text-muted/70">Платёж сразу записывается в расходы. Ошиблись — удалите его в «Операциях», остаток вернётся.</p>
    </Page>
  )
}

const Info = ({ label, value, warn, big }: { label: string; value: string; warn?: boolean; big?: boolean }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-muted">{label}</p>
    <p className={`num truncate ${big ? 'text-lg' : 'text-base'} ${warn ? 'text-warn' : ''}`}>{value}</p>
  </div>
)
