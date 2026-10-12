import { useState, type FormEvent } from 'react'
import { AddPanel, Badge, Card, DeleteBtn, Empty, Field, Page, ProgressBar } from '../components/ui'
import { isOverdue } from '../lib/calc'
import { dateLabel, fmtMoney, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'

function DebtForm({ done }: { done: () => void }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  const [total, setTotal] = useState('')
  const [remaining, setRemaining] = useState('')
  const [monthly, setMonthly] = useState('')
  const [next, setNext] = useState(todayISO())

  const num = (s: string) => parseFloat(s.replace(',', '.'))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = num(total)
    const r = remaining.trim() ? num(remaining) : t
    const m = num(monthly)
    if (!name.trim() || !(t > 0) || !(m > 0) || !(r >= 0)) return
    dispatch({
      type: 'addDebt',
      item: { id: uid(), name: name.trim(), total: t, remaining: Math.min(r, t), monthlyPayment: m, nextPaymentDate: next, payments: [] },
    })
    done()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Название / кому должен">
        <input className="field" required placeholder="Кредит в банке, Иван…" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Общая сумма">
          <input className="field" inputMode="decimal" required value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <Field label="Остаток долга">
          <input className="field" inputMode="decimal" placeholder="= сумме" value={remaining} onChange={(e) => setRemaining(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Платёж в месяц">
          <input className="field" inputMode="decimal" required value={monthly} onChange={(e) => setMonthly(e.target.value)} />
        </Field>
        <Field label="Следующий платёж">
          <input className="field" type="date" required value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
      <button className="btn w-full" type="submit">Добавить долг</button>
    </form>
  )
}

export default function Debts() {
  const { data, dispatch } = useStore()
  const totalLeft = data.debts.reduce((s, d) => s + d.remaining, 0)

  return (
    <Page title="Долги и кредиты">
      <Card className="text-center">
        <p className="text-xs text-muted">Общий остаток долгов</p>
        <p className="num text-4xl">{fmtMoney(totalLeft)}</p>
      </Card>

      <AddPanel title="Добавить долг">{(close) => <DebtForm done={close} />}</AddPanel>

      {data.debts.length === 0 ? <Empty>Долгов нет 🎉</Empty> : (
        <ul className="space-y-3">
          {data.debts.map((d, i) => {
            const overdue = isOverdue(d)
            const closed = d.remaining <= 0
            return (
              <Card key={d.id} delay={i * 60} className={overdue ? 'ring-1 ring-warn/60' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">{d.name}</h3>
                    <div className="mt-1 flex gap-2">
                      {overdue && <Badge warn>Просрочено</Badge>}
                      {closed && <Badge>Погашено</Badge>}
                    </div>
                  </div>
                  <DeleteBtn onClick={() => confirm(`Удалить «${d.name}»?`) && dispatch({ type: 'deleteDebt', id: d.id })} />
                </div>

                <div className="my-3 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted">Остаток</p><p className={`num text-xl ${overdue ? 'text-warn' : ''}`}>{fmtMoney(d.remaining)}</p></div>
                  <div><p className="text-xs text-muted">Общая сумма</p><p className="num text-xl">{fmtMoney(d.total)}</p></div>
                  <div><p className="text-xs text-muted">Платёж в месяц</p><p className="num text-base">{fmtMoney(d.monthlyPayment)}</p></div>
                  <div>
                    <p className="text-xs text-muted">След. платёж</p>
                    <p className={`num text-base ${overdue ? 'text-warn' : ''}`}>{closed ? '—' : dateLabel(d.nextPaymentDate)}</p>
                  </div>
                </div>

                <ProgressBar value={d.total - d.remaining} max={d.total} warn={overdue} />
                <p className="mt-1 text-xs text-muted">Выплачено {fmtMoney(d.total - d.remaining)}</p>

                {!closed && (
                  <button type="button" className={`mt-3 w-full ${overdue ? 'btn !bg-warn !text-white' : 'btn-ghost'}`}
                    onClick={() => dispatch({ type: 'payDebt', id: d.id })}>
                    Отметить платёж {fmtMoney(Math.min(d.monthlyPayment, d.remaining))}
                  </button>
                )}
              </Card>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
