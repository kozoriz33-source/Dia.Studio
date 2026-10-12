import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Bill, Debt, Expense, Income, Limit } from '../lib/types'
import { parseAmount, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'
import { AmountInput, CategoryPicker, DateInput, DeleteButton, Field, Segmented, Sheet } from './ui'

export type SheetSpec =
  | { kind: 'operation'; mode: 'expense' | 'income'; item?: Expense | Income; preset?: { category?: string; amount?: number; note?: string } }
  | { kind: 'debt'; item?: Debt; preset?: { name?: string; category?: string } }
  | { kind: 'bill'; item?: Bill; preset?: { name?: string; category?: string } }
  | { kind: 'limit'; item?: Limit }

const Ctx = createContext<(s: SheetSpec) => void>(() => {})
export const useOpenSheet = () => useContext(Ctx)

export function SheetHost({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<SheetSpec | null>(null)
  const close = useMemo(() => () => setSpec(null), [])
  return (
    <Ctx.Provider value={setSpec}>
      {children}
      {spec?.kind === 'operation' && <OperationSheet spec={spec} onClose={close} />}
      {spec?.kind === 'debt' && <DebtSheet item={spec.item} preset={spec.preset} onClose={close} />}
      {spec?.kind === 'bill' && <BillSheet item={spec.item} preset={spec.preset} onClose={close} />}
      {spec?.kind === 'limit' && <LimitSheet item={spec.item} onClose={close} />}
    </Ctx.Provider>
  )
}

const numStr = (n?: number) => (n ? String(n).replace('.', ',') : '')

/* ---------- Доход / расход ---------- */

function OperationSheet({ spec, onClose }: { spec: Extract<SheetSpec, { kind: 'operation' }>; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const edit = spec.item
  const [mode, setMode] = useState(spec.mode)
  const [amount, setAmount] = useState(numStr(edit?.amount ?? spec.preset?.amount))
  const [category, setCategory] = useState(
    (edit && 'category' in edit ? edit.category : spec.preset?.category) ?? 'Продукты',
  )
  const [source, setSource] = useState(edit && 'source' in edit ? edit.source : '')
  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [note, setNote] = useState(edit?.note ?? spec.preset?.note ?? '')

  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of data.incomes) counts.set(i.source, (counts.get(i.source) ?? 0) + 1)
    const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
    return list.length ? list.slice(0, 6) : ['Зарплата', 'Аванс', 'Подработка']
  }, [data.incomes])

  const n = parseAmount(amount)
  const valid = n > 0 && (mode === 'expense' ? !!category : !!source.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    if (mode === 'expense') {
      const prev = edit as Expense | undefined
      const item: Expense = {
        id: prev?.id ?? uid(), amount: n, category, date, note: note.trim(),
        ...(prev?.debtId && { debtId: prev.debtId }), ...(prev?.billId && { billId: prev.billId }),
      }
      dispatch({ type: edit ? 'updateExpense' : 'addExpense', item })
    } else {
      const item: Income = { id: edit?.id ?? uid(), amount: n, source: source.trim(), date, note: note.trim() }
      dispatch({ type: edit ? 'updateIncome' : 'addIncome', item })
    }
    onClose()
  }

  const linked = edit && 'category' in edit && (edit.debtId || edit.billId)
  const title = edit ? (mode === 'expense' ? 'Изменить расход' : 'Изменить доход') : 'Новая операция'

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {!edit && (
          <Segmented value={mode} onChange={setMode}
            options={[{ value: 'expense', label: 'Расход' }, { value: 'income', label: 'Доход' }]} />
        )}
        <AmountInput value={amount} onChange={setAmount} autoFocus={!edit} />

        {mode === 'expense' ? (
          <Field label="Категория">
            <CategoryPicker categories={data.categories} value={category} onChange={setCategory} />
          </Field>
        ) : (
          <Field label="Источник">
            <input className="field" placeholder="Зарплата, подработка…" value={source} onChange={(e) => setSource(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <button key={s} type="button" onClick={() => setSource(s)}
                  className={`chip ${source === s ? '!bg-accent !text-bg' : ''}`}>{s}</button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Дата">
          <DateInput value={date} onChange={setDate} />
        </Field>
        <Field label="Заметка">
          <input className="field" placeholder="Необязательно" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {linked && (
          <p className="rounded-xl bg-panel2 p-3 text-xs text-muted">
            {edit && 'debtId' in edit && edit.debtId
              ? 'Это платёж по кредиту. При изменении суммы или удалении остаток кредита пересчитается.'
              : 'Это отметка регулярного платежа. Если удалить, платёж снова станет неоплаченным.'}
          </p>
        )}
        <button className="btn w-full" type="submit" disabled={!valid}>{edit ? 'Сохранить' : 'Добавить'}</button>
        {edit && (
          <DeleteButton onDelete={() => {
            dispatch({ type: mode === 'expense' ? 'deleteExpense' : 'deleteIncome', id: edit.id })
            onClose()
          }} />
        )}
      </form>
    </Sheet>
  )
}

/* ---------- Кредит ---------- */

function DebtSheet({ item, preset, onClose }: { item?: Debt; preset?: { name?: string; category?: string }; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const [name, setName] = useState(item?.name ?? preset?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? preset?.category ?? 'Кредит')
  const [total, setTotal] = useState(numStr(item?.total))
  const [remaining, setRemaining] = useState(numStr(item?.remaining))
  const [monthly, setMonthly] = useState(numStr(item?.monthlyPayment))
  const [next, setNext] = useState(item?.nextPaymentDate ?? todayISO())

  const t = parseAmount(total)
  const r = remaining.trim() ? parseAmount(remaining) : t
  const m = parseAmount(monthly)
  const valid = !!name.trim() && t > 0 && m > 0 && r >= 0
  const creditCats = data.categories.filter((c) => c.group === 'credit')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const d: Debt = {
      id: item?.id ?? uid(), name: name.trim(), category, total: t, remaining: Math.min(r, t),
      monthlyPayment: m, nextPaymentDate: next, payments: item?.payments ?? [],
    }
    dispatch({ type: item ? 'updateDebt' : 'addDebt', item: d })
    onClose()
  }

  return (
    <Sheet title={item ? 'Изменить кредит' : 'Новый кредит'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Название / кому должен">
          <input className="field" placeholder="Кредит за машину, банк…" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Категория платежей">
          <div className="flex flex-wrap gap-1.5">
            {creditCats.map((c) => (
              <button key={c.name} type="button" onClick={() => setCategory(c.name)}
                className={`chip ${category === c.name ? '!bg-[#a78bfa] !text-bg' : ''}`}>{c.icon} {c.name}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сумма кредита">
            <input className="field" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
          </Field>
          <Field label="Осталось выплатить">
            <input className="field" inputMode="decimal" placeholder="= сумме" value={remaining} onChange={(e) => setRemaining(e.target.value)} />
          </Field>
          <Field label="Платёж в месяц">
            <input className="field" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </Field>
          <Field label="Следующий платёж">
            <input className="field" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
        </div>
        <button className="btn w-full" type="submit" disabled={!valid}>{item ? 'Сохранить' : 'Добавить кредит'}</button>
        {item && <DeleteButton label="Удалить кредит" onDelete={() => { dispatch({ type: 'deleteDebt', id: item.id }); onClose() }} />}
      </form>
    </Sheet>
  )
}

/* ---------- Регулярный платёж ---------- */

function BillSheet({ item, preset, onClose }: { item?: Bill; preset?: { name?: string; category?: string }; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const [name, setName] = useState(item?.name ?? preset?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? preset?.category ?? 'Прочее')
  const [amount, setAmount] = useState(numStr(item?.amount))
  const [day, setDay] = useState(String(item?.day ?? new Date().getDate()))

  const n = parseAmount(amount)
  const d = Math.round(Number(day))
  const valid = !!name.trim() && n > 0 && d >= 1 && d <= 31

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    dispatch({ type: item ? 'updateBill' : 'addBill', item: { id: item?.id ?? uid(), name: name.trim(), category, amount: n, day: d } })
    onClose()
  }

  return (
    <Sheet title={item ? 'Изменить платёж' : 'Регулярный платёж'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <AmountInput value={amount} onChange={setAmount} autoFocus={!item} />
        <Field label="Название">
          <input className="field" placeholder="Netflix, Vodafone, аренда…" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Каждый месяц, число">
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost !px-4" onClick={() => setDay(String(Math.max(1, d - 1)))}>−</button>
            <input className="field text-center" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className="btn-ghost !px-4" onClick={() => setDay(String(Math.min(31, d + 1)))}>+</button>
          </div>
        </Field>
        <Field label="Категория">
          <CategoryPicker categories={data.categories.filter((c) => !['daily', 'savings'].includes(c.group))}
            value={category} onChange={(c) => { setCategory(c); if (!name.trim()) setName(c) }} />
        </Field>
        <button className="btn w-full" type="submit" disabled={!valid}>{item ? 'Сохранить' : 'Добавить платёж'}</button>
        {item && <DeleteButton label="Удалить платёж" onDelete={() => { dispatch({ type: 'deleteBill', id: item.id }); onClose() }} />}
      </form>
    </Sheet>
  )
}

/* ---------- Лимит ---------- */

const TOTAL = '__total__'

function LimitSheet({ item, onClose }: { item?: Limit; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const [target, setTarget] = useState(item ? item.category ?? TOTAL : TOTAL)
  const [amount, setAmount] = useState(numStr(item?.amount))
  const n = parseAmount(amount)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!(n > 0)) return
    dispatch({ type: 'setLimit', item: { id: item?.id ?? uid(), category: target === TOTAL ? null : target, amount: n } })
    onClose()
  }

  return (
    <Sheet title={item ? 'Изменить лимит' : 'Новый лимит'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <AmountInput value={amount} onChange={setAmount} autoFocus={!item} />
        <Field label="На что лимит в месяц">
          <button type="button" onClick={() => setTarget(TOTAL)}
            className={`chip mb-3 ${target === TOTAL ? '!bg-accent !text-bg' : ''}`}>💼 Общий лимит на все расходы</button>
          <CategoryPicker categories={data.categories} value={target} onChange={setTarget} />
        </Field>
        <button className="btn w-full" type="submit" disabled={!(n > 0)}>Сохранить</button>
        {item && <DeleteButton label="Удалить лимит" onDelete={() => { dispatch({ type: 'deleteLimit', id: item.id }); onClose() }} />}
      </form>
    </Sheet>
  )
}
