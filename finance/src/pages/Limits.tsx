import { useState, type FormEvent } from 'react'
import { AddPanel, Card, DeleteBtn, Empty, Field, Page, ProgressBar } from '../components/ui'
import { inMonth, sum } from '../lib/calc'
import { currentMonth, fmtMoney, monthLabel, uid } from '../lib/format'
import { useStore } from '../lib/store'

const TOTAL = '__total__'

function LimitForm({ done }: { done: () => void }) {
  const { data, dispatch } = useStore()
  const [target, setTarget] = useState(TOTAL)
  const [amount, setAmount] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = parseFloat(amount.replace(',', '.'))
    if (!(n > 0)) return
    dispatch({ type: 'setLimit', item: { id: uid(), category: target === TOTAL ? null : target, amount: n } })
    done()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="На что лимит">
        <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value={TOTAL}>Общий лимит на месяц</option>
          {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Сумма в месяц">
        <input className="field" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <p className="text-xs text-muted">Если лимит на это уже задан — он будет заменён.</p>
      <button className="btn w-full" type="submit">Сохранить лимит</button>
    </form>
  )
}

export default function Limits() {
  const { data, dispatch } = useStore()
  const ym = currentMonth()
  const month = inMonth(data.expenses, ym)
  const limits = [...data.limits].sort((a, b) => (a.category === null ? -1 : b.category === null ? 1 : 0))

  return (
    <Page title="Лимиты">
      <p className="-mt-2 text-sm text-muted">{monthLabel(ym)}</p>
      <AddPanel title="Задать лимит">{(close) => <LimitForm done={close} />}</AddPanel>

      {limits.length === 0 ? <Empty>Лимитов пока нет</Empty> : (
        <ul className="space-y-3">
          {limits.map((l, i) => {
            const spent = sum(l.category === null ? month : month.filter((e) => e.category === l.category))
            const ratio = spent / l.amount
            const exceeded = ratio > 1
            const warn = ratio >= 0.8
            return (
              <Card key={l.id} delay={i * 60} className={exceeded ? 'ring-1 ring-warn/60' : ''}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{l.category ?? 'Общий лимит'}</h3>
                  <DeleteBtn onClick={() => dispatch({ type: 'deleteLimit', id: l.id })} />
                </div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className={`num text-2xl ${warn ? 'text-warn' : ''}`}>{fmtMoney(spent)}</span>
                  <span className="text-sm text-muted">из <span className="num">{fmtMoney(l.amount)}</span></span>
                </div>
                <ProgressBar value={spent} max={l.amount} warn={warn} />
                <p className={`mt-2 text-xs ${warn ? 'text-warn' : 'text-muted'}`}>
                  {exceeded
                    ? `Превышен на ${fmtMoney(spent - l.amount)}`
                    : `Осталось ${fmtMoney(l.amount - spent)} · ${Math.round(ratio * 100)}%`}
                </p>
              </Card>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
