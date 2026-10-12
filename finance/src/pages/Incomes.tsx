import { useState, type FormEvent } from 'react'
import { AddPanel, Card, Empty, Field, MonthSelect, Page, SectionTitle } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { inMonth, monthsOf, sum } from '../lib/calc'
import { currentMonth, fmtMoney, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'

function IncomeForm({ done }: { done: () => void }) {
  const { dispatch } = useStore()
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = parseFloat(amount.replace(',', '.'))
    if (!(n > 0) || !source.trim()) return
    dispatch({ type: 'addIncome', item: { id: uid(), amount: n, source: source.trim(), date, note: note.trim() } })
    done()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Сумма">
        <input className="field" inputMode="decimal" placeholder="0" required value={amount}
          onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Источник">
        <input className="field" placeholder="Зарплата, фриланс…" required value={source}
          onChange={(e) => setSource(e.target.value)} />
      </Field>
      <Field label="Дата">
        <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Заметка">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button className="btn w-full" type="submit">Добавить доход</button>
    </form>
  )
}

export default function Incomes() {
  const { data, dispatch } = useStore()
  const months = monthsOf(data.incomes, currentMonth())
  const [ym, setYm] = useState(months[0])
  const list = inMonth(data.incomes, ym).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Page title="Доходы">
      <AddPanel title="Добавить доход">{(close) => <IncomeForm done={close} />}</AddPanel>
      <Card delay={80}>
        <SectionTitle right={<MonthSelect value={ym} options={months} onChange={setYm} />}>История</SectionTitle>
        <div className="mb-2 rounded-xl bg-panel2 p-3">
          <p className="text-xs text-muted">Итого за период</p>
          <p className="num text-3xl text-accent">{fmtMoney(sum(list))}</p>
        </div>
        {list.length === 0 ? <Empty>Нет доходов за этот месяц</Empty> : (
          <ul className="divide-y divide-line">
            {list.map((i) => (
              <OperationRow key={i.id} op={{ kind: 'income', ...i }}
                onDelete={() => dispatch({ type: 'deleteIncome', id: i.id })} />
            ))}
          </ul>
        )}
      </Card>
    </Page>
  )
}
