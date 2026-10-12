import { useState, type FormEvent } from 'react'
import { AddPanel, Card, Empty, Field, MonthSelect, Page, ProgressBar, SectionTitle } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { byCategory, inMonth, monthsOf, sum } from '../lib/calc'
import { currentMonth, fmtMoney, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'

const NEW = '__new__'

function ExpenseForm({ done }: { done: () => void }) {
  const { data, dispatch } = useStore()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(data.categories[0])
  const [custom, setCustom] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = parseFloat(amount.replace(',', '.'))
    const cat = category === NEW ? custom.trim() : category
    if (!(n > 0) || !cat) return
    if (category === NEW) dispatch({ type: 'addCategory', name: cat })
    dispatch({ type: 'addExpense', item: { id: uid(), amount: n, category: cat, date, note: note.trim() } })
    done()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Сумма">
        <input className="field" inputMode="decimal" placeholder="0" required value={amount}
          onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Категория">
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value={NEW}>+ Новая категория…</option>
        </select>
      </Field>
      {category === NEW && (
        <Field label="Название категории">
          <input className="field" required value={custom} onChange={(e) => setCustom(e.target.value)} />
        </Field>
      )}
      <Field label="Дата">
        <input className="field" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Заметка">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button className="btn w-full" type="submit">Добавить расход</button>
    </form>
  )
}

export default function Expenses() {
  const { data, dispatch } = useStore()
  const months = monthsOf(data.expenses, currentMonth())
  const [ym, setYm] = useState(months[0])
  const [cat, setCat] = useState('')

  const monthList = inMonth(data.expenses, ym)
  const list = monthList
    .filter((e) => !cat || e.category === cat)
    .sort((a, b) => b.date.localeCompare(a.date))
  const total = sum(monthList)
  const top = byCategory(monthList).slice(0, 5)

  return (
    <Page title="Расходы">
      <AddPanel title="Добавить расход">{(close) => <ExpenseForm done={close} />}</AddPanel>

      <Card delay={80}>
        <SectionTitle>Топ-5 категорий</SectionTitle>
        {top.length === 0 ? <Empty>Нет расходов за этот месяц</Empty> : (
          <ul className="space-y-3">
            {top.map((c) => {
              const pct = total > 0 ? (c.value / total) * 100 : 0
              return (
                <li key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span><span className="num">{fmtMoney(c.value)}</span> <span className="text-muted">· {pct.toFixed(0)}%</span></span>
                  </div>
                  <ProgressBar value={c.value} max={total} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card delay={160}>
        <SectionTitle right={<MonthSelect value={ym} options={months} onChange={setYm} />}>Операции</SectionTitle>
        <select className="field mb-3" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Все категории</option>
          {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="mb-2 rounded-xl bg-panel2 p-3">
          <p className="text-xs text-muted">{cat || 'Всего'} за период</p>
          <p className="num text-3xl">{fmtMoney(sum(list))}</p>
        </div>
        {list.length === 0 ? <Empty>Ничего не найдено</Empty> : (
          <ul className="divide-y divide-line">
            {list.map((e) => (
              <OperationRow key={e.id} op={{ kind: 'expense', ...e }}
                onDelete={() => dispatch({ type: 'deleteExpense', id: e.id })} />
            ))}
          </ul>
        )}
      </Card>
    </Page>
  )
}
