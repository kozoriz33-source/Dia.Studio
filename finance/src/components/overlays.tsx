import { createContext, useCallback, useContext, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { AppData, Bill, Debt, Expense, Income, Limit } from '../lib/types'
import { dueDate, fmtMoney, monthOf, parseAmount, shiftDays, todayISO, uid, addMonthsYM, dayLabel, CURRENCIES } from '../lib/format'
import { GROUPS, GROUP_ORDER, MANDATORY_GROUPS, catInfo } from '../lib/categories'
import { topCategories, type Operation } from '../lib/calc'
import { useStore } from '../lib/store'
import { CatIcon, DeleteButton, Field, Segmented, Sheet } from './ui'
import { IconBackspace, IconBell } from './icons'

export type Overlay =
  | { kind: 'quick'; mode?: 'expense' | 'income'; category?: string }
  | { kind: 'edit'; op: Operation }
  | { kind: 'obligation'; type?: 'bill' | 'debt'; bill?: Bill; debt?: Debt; preset?: { name: string; category: string } }
  | { kind: 'limit'; item?: Limit }
  | { kind: 'balance' }
  | { kind: 'salary' }

interface Toast { id: number; text: string; undo?: AppData }

interface UI {
  open: (o: Overlay) => void
  /** Показать уведомление; snapshot — состояние для кнопки «Отменить» */
  toast: (text: string, snapshot?: AppData) => void
}

const Ctx = createContext<UI>({ open: () => {}, toast: () => {} })
export const useUI = () => useContext(Ctx)

export function OverlayHost({ children }: { children: ReactNode }) {
  const { dispatch } = useStore()
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const close = useCallback(() => setOverlay(null), [])
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const ui = useMemo<UI>(() => ({
    open: setOverlay,
    toast: (text, undo) => {
      clearTimeout(timer.current)
      setToast({ id: Date.now(), text, undo })
      timer.current = setTimeout(() => setToast(null), 4500)
    },
  }), [])

  return (
    <Ctx.Provider value={ui}>
      {children}
      {overlay?.kind === 'quick' && <QuickAdd spec={overlay} onClose={close} />}
      {overlay?.kind === 'edit' && <EditOperation op={overlay.op} onClose={close} />}
      {overlay?.kind === 'obligation' && <ObligationSheet spec={overlay} onClose={close} />}
      {overlay?.kind === 'limit' && <LimitSheet item={overlay.item} onClose={close} />}
      {overlay?.kind === 'balance' && <BalanceSheet onClose={close} />}
      {overlay?.kind === 'salary' && <SalarySheet onClose={close} />}
      {toast && (
        <div key={toast.id} className="fixed inset-x-0 z-50 flex animate-pop justify-center px-4"
          style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex max-w-md flex-1 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-float">
            <span className="flex-1">{toast.text}</span>
            {toast.undo && (
              <button type="button" className="font-semibold text-[#9DB2FF]"
                onClick={() => { dispatch({ type: 'replaceAll', data: { ...toast.undo!, updatedAt: Date.now() } }); setToast(null) }}>
                Отменить
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

const numStr = (n?: number) => (n ? String(Math.round(n * 100) / 100).replace('.', ',') : '')

/* ---------- Цифровая клавиатура ---------- */

function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (k === 'back') return onChange(value.slice(0, -1))
    if (k === ',') return onChange(value.includes(',') ? value : (value || '0') + ',')
    const [int, dec] = value.split(',')
    if (dec !== undefined && dec.length >= 2) return
    if (dec === undefined && int.replace(/^0/, '').length >= 7) return
    onChange(value === '0' ? k : value + k)
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back']
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'back' ? 'Стереть' : k}
          className="flex h-[54px] items-center justify-center rounded-2xl bg-soft text-[24px] font-semibold transition active:scale-95 active:bg-line">
          {k === 'back' ? <IconBackspace /> : k}
        </button>
      ))}
    </div>
  )
}

const amountView = (s: string) => {
  if (!s) return '0'
  const [i, d] = s.split(',')
  const int = Number(i || 0).toLocaleString('ru-RU')
  return d !== undefined ? `${int},${d}` : int
}

/* ---------- Быстрый ввод ---------- */

function QuickAdd({ spec, onClose }: { spec: Extract<Overlay, { kind: 'quick' }>; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const { toast } = useUI()
  const [mode, setMode] = useState(spec.mode ?? 'expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string | null>(spec.category ?? null)
  const [source, setSource] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState<'none' | 'date' | 'all'>('none')
  const n = parseAmount(amount)

  const top = useMemo(() => {
    const t = topCategories(data, 7)
    return spec.category && !t.includes(spec.category) ? [spec.category, ...t.slice(0, 6)] : t
  }, [data, spec.category])

  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of data.incomes) counts.set(i.source, (counts.get(i.source) ?? 0) + 1)
    const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
    for (const s of ['Зарплата', 'Аванс', 'Подработка', 'Возврат долга']) if (!list.includes(s)) list.push(s)
    return list.slice(0, 6)
  }, [data.incomes])

  const save = (cat = category, src = source) => {
    if (!(n > 0)) return
    const before = data
    if (mode === 'expense') {
      if (!cat) return
      dispatch({ type: 'addExpense', item: { id: uid(), amount: n, category: cat, date, note: note.trim(), ts: Date.now() } })
      toast(`−${fmtMoney(n)} · ${cat}`, before)
    } else {
      if (!src?.trim()) return
      dispatch({ type: 'addIncome', item: { id: uid(), amount: n, source: src.trim(), date, note: note.trim(), ts: Date.now() } })
      toast(`+${fmtMoney(n)} · ${src}`, before)
    }
    onClose()
  }

  // нажатие на категорию при введённой сумме сразу сохраняет
  const tapCategory = (c: string) => {
    if (n > 0 && !spec.category) return save(c)
    setCategory(c)
    setPicker('none')
  }
  const tapSource = (s: string) => {
    if (n > 0) return save(null, s)
    setSource(s)
  }

  const t = todayISO()
  const ready = n > 0 && (mode === 'expense' ? !!category : !!source)

  return (
    <Sheet onClose={onClose} flush>
      <div className="flex items-center gap-2 px-4 pb-2">
        <div className="flex-1"><Segmented value={mode} onChange={(m) => { setMode(m); setPicker('none') }}
          options={[{ value: 'expense', label: 'Расход' }, { value: 'income', label: 'Доход' }]} /></div>
        <button type="button" onClick={() => setPicker(picker === 'date' ? 'none' : 'date')}
          className={`rounded-2xl px-3 py-2.5 text-sm font-semibold ${date === t ? 'bg-soft text-ink' : 'bg-accentSoft text-accent'}`}>
          📅 {dayLabel(date)}
        </button>
      </div>

      {picker === 'date' && (
        <div className="flex animate-fade gap-2 px-4 pb-2">
          {[0, -1, -2].map((d) => {
            const v = shiftDays(t, d)
            return (
              <button key={d} type="button" onClick={() => { setDate(v); setPicker('none') }}
                className={`chip ${date === v ? 'chip-on' : ''}`}>{d === 0 ? 'Сегодня' : d === -1 ? 'Вчера' : 'Позавчера'}</button>
            )
          })}
          <input type="date" className="field !py-1.5 !text-sm" value={date} max={shiftDays(t, 365)}
            onChange={(e) => { if (e.target.value) { setDate(e.target.value); setPicker('none') } }} />
        </div>
      )}

      <div className="px-4 py-2 text-center">
        <p className={`num text-[44px] leading-none ${n > 0 ? (mode === 'income' ? 'text-ok' : 'text-ink') : 'text-ink3'}`}>
          {mode === 'income' && n > 0 ? '+' : ''}{amountView(amount)} <span className="text-[28px]">{data.settings.currency}</span>
        </p>
        <input className="mx-auto mt-2 w-full max-w-[240px] rounded-xl bg-transparent text-center text-sm text-ink2 outline-none placeholder:text-ink3"
          placeholder="+ заметка (необязательно)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {mode === 'expense' ? (
          picker === 'all' ? (
            <div className="space-y-3 pb-2">
              {GROUP_ORDER.map((g) => {
                const list = data.categories.filter((c) => c.group === g)
                if (!list.length) return null
                return (
                  <div key={g}>
                    <p className="mb-1.5 text-[12px] font-semibold" style={{ color: GROUPS[g].color }}>{GROUPS[g].label}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {list.map((c) => <CatTile key={c.name} name={c.name} onTap={tapCategory} on={category === c.name} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <p className="mb-2 text-center text-[12px] font-medium text-ink3">
                {n > 0 && !spec.category ? 'Нажмите категорию — и готово' : 'Категория'}
              </p>
              <div className="grid grid-cols-4 gap-1.5 pb-2">
                {top.map((c) => <CatTile key={c} name={c} onTap={tapCategory} on={category === c} />)}
                <button type="button" onClick={() => setPicker('all')}
                  className="flex flex-col items-center gap-1 rounded-2xl p-1.5 text-[11px] font-medium text-ink2 active:bg-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-soft text-lg">•••</span>
                  Все
                </button>
              </div>
            </>
          )
        ) : (
          <div className="flex flex-wrap justify-center gap-1.5 pb-3">
            {sources.map((s) => (
              <button key={s} type="button" onClick={() => tapSource(s)} className={`chip ${source === s ? 'chip-on' : ''}`}>💰 {s}</button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-line px-4 pt-3">
        <Keypad value={amount} onChange={setAmount} />
        <button type="button" disabled={!ready} onClick={() => save()} className={`w-full ${mode === 'income' ? 'btn !bg-ok' : 'btn'}`}>
          {ready ? `Добавить ${fmtMoney(n)}` : n > 0 ? (mode === 'expense' ? 'Выберите категорию' : 'Выберите источник') : 'Введите сумму'}
        </button>
      </div>
    </Sheet>
  )
}

function CatTile({ name, on, onTap }: { name: string; on: boolean; onTap: (n: string) => void }) {
  const { data } = useStore()
  const c = catInfo(data.categories, name)
  return (
    <button type="button" onClick={() => onTap(name)}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl p-1.5 text-[11px] font-medium leading-tight transition active:scale-95 ${on ? 'bg-ink text-white' : 'text-ink'}`}>
      <CatIcon cat={c} size={44} />
      <span className="line-clamp-2 w-full text-center">{name}</span>
    </button>
  )
}

/* ---------- Выбор категории (формы) ---------- */

function CategoryPicker({ value, onChange, groups = GROUP_ORDER }: { value: string; onChange: (n: string) => void; groups?: typeof GROUP_ORDER }) {
  const { data } = useStore()
  return (
    <div className="space-y-2.5">
      {groups.map((g) => {
        const list = data.categories.filter((c) => c.group === g)
        if (!list.length) return null
        return (
          <div key={g}>
            <p className="mb-1 text-[12px] font-semibold" style={{ color: GROUPS[g].color }}>{GROUPS[g].label}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((c) => (
                <button key={c.name} type="button" onClick={() => onChange(c.name)} className={`chip ${value === c.name ? 'chip-on' : ''}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = todayISO()
  return (
    <div className="flex gap-2">
      {[{ v: t, l: 'Сегодня' }, { v: shiftDays(t, -1), l: 'Вчера' }].map((q) => (
        <button key={q.l} type="button" onClick={() => onChange(q.v)} className={`chip !py-2.5 ${value === q.v ? 'chip-on' : ''}`}>{q.l}</button>
      ))}
      <input className="field !py-2" type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </div>
  )
}

/* ---------- Редактирование операции ---------- */

function EditOperation({ op, onClose }: { op: Operation; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const { toast } = useUI()
  const isExp = op.kind === 'expense'
  const [amount, setAmount] = useState(numStr(op.amount))
  const [date, setDate] = useState(op.date)
  const [category, setCategory] = useState(isExp ? op.category : '')
  const [source, setSource] = useState(isExp ? '' : op.source)
  const [note, setNote] = useState(op.note)
  const n = parseAmount(amount)
  const valid = n > 0 && (isExp ? !!category : !!source.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const before = data
    if (isExp) {
      const item: Expense = {
        id: op.id, amount: n, category, date, note: note.trim(), ts: op.ts,
        ...(op.debtId && { debtId: op.debtId }), ...(op.billId && { billId: op.billId }),
      }
      dispatch({ type: 'updateExpense', item })
    } else {
      const item: Income = { id: op.id, amount: n, source: source.trim(), date, note: note.trim(), ts: op.ts }
      dispatch({ type: 'updateIncome', item })
    }
    toast('Сохранено', before)
    onClose()
  }

  return (
    <Sheet title={isExp ? 'Расход' : 'Доход'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-1">
        <Field label="Дата">
          <DateField value={date} onChange={setDate} />
        </Field>
        <Field label="Сумма">
          <input className="field num !text-2xl" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        {isExp ? (
          <Field label="Категория"><CategoryPicker value={category} onChange={setCategory} /></Field>
        ) : (
          <Field label="Источник"><input className="field" value={source} onChange={(e) => setSource(e.target.value)} /></Field>
        )}
        <Field label="Заметка">
          <input className="field" placeholder="Необязательно" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {isExp && (op.debtId || op.billId) && (
          <p className="rounded-2xl bg-soft p-3 text-[13px] text-ink2">
            {op.debtId ? 'Платёж по кредиту: если удалить его, остаток кредита вернётся.' : 'Отметка обязательного платежа: если удалить её, платёж снова станет неоплаченным.'}
          </p>
        )}
        <button className="btn w-full" type="submit" disabled={!valid}>Сохранить</button>
        <DeleteButton onDelete={() => {
          const before = data
          dispatch({ type: isExp ? 'deleteExpense' : 'deleteIncome', id: op.id })
          toast('Удалено', before)
          onClose()
        }} />
      </form>
    </Sheet>
  )
}

/* ---------- Обязательный платёж / кредит ---------- */

/** Ссылка на создание ежемесячного напоминания в Google Календаре */
function calendarLink(title: string, firstDate: string, count?: number) {
  const d = firstDate.replace(/-/g, '')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `💳 ${title}`,
    dates: `${d}T090000/${d}T091500`,
    details: 'Напоминание о платеже из приложения «Финансы»',
    recur: `RRULE:FREQ=MONTHLY${count ? `;COUNT=${count}` : ''}`,
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

function ObligationSheet({ spec, onClose }: { spec: Extract<Overlay, { kind: 'obligation' }>; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const { toast } = useUI()
  const editing = spec.bill ?? spec.debt
  const [type, setType] = useState<'bill' | 'debt'>(spec.debt ? 'debt' : spec.bill ? 'bill' : spec.type ?? 'bill')
  const [name, setName] = useState(spec.bill?.name ?? spec.debt?.name ?? spec.preset?.name ?? '')
  const [category, setCategory] = useState(spec.bill?.category ?? spec.debt?.category ?? spec.preset?.category ?? (type === 'debt' ? 'Кредит' : 'Другая подписка'))
  const [amount, setAmount] = useState(numStr(spec.bill?.amount ?? spec.debt?.monthlyPayment))
  const [day, setDay] = useState(spec.bill?.day ?? Number((spec.debt?.nextPaymentDate ?? todayISO()).slice(8)))
  const [next, setNext] = useState(spec.debt?.nextPaymentDate ?? '')
  const [total, setTotal] = useState(numStr(spec.debt?.total))
  const [remaining, setRemaining] = useState(numStr(spec.debt?.remaining))

  const t = todayISO()
  const m = parseAmount(amount)
  const tot = parseAmount(total)
  const rem = remaining.trim() ? parseAmount(remaining) : tot
  const valid = !!name.trim() && m > 0 && day >= 1 && day <= 31 && (type === 'bill' || (tot > 0 && rem >= 0))

  // ближайшая дата платежа для выбранного числа
  const upcomingDate = () => {
    const d = dueDate(monthOf(t), day)
    return d >= t ? d : dueDate(addMonthsYM(monthOf(t), 1), day)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const before = data
    if (type === 'bill') {
      const item: Bill = { id: spec.bill?.id ?? uid(), name: name.trim(), category, amount: m, day }
      dispatch({ type: spec.bill ? 'updateBill' : 'addBill', item })
    } else {
      const item: Debt = {
        id: spec.debt?.id ?? uid(), name: name.trim(), category, total: tot, remaining: Math.min(rem, tot),
        monthlyPayment: m, nextPaymentDate: next || upcomingDate(), payments: spec.debt?.payments ?? [],
      }
      dispatch({ type: spec.debt ? 'updateDebt' : 'addDebt', item })
    }
    toast(editing ? 'Сохранено' : `Добавлено: ${name.trim()}`, before)
    onClose()
  }

  const reminder = spec.bill
    ? calendarLink(spec.bill.name, upcomingDate())
    : spec.debt && spec.debt.remaining > 0
      ? calendarLink(spec.debt.name, spec.debt.nextPaymentDate, Math.ceil(spec.debt.remaining / spec.debt.monthlyPayment))
      : null

  return (
    <Sheet title={editing ? name || 'Платёж' : 'Новый платёж'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-1">
        {!editing && (
          <Segmented value={type} onChange={(v) => { setType(v); if (v === 'debt' && !spec.preset) setCategory('Кредит') }}
            options={[{ value: 'bill', label: 'Ежемесячный' }, { value: 'debt', label: 'Кредит / рассрочка' }]} />
        )}
        <Field label="Название">
          <input className="field" placeholder={type === 'debt' ? 'Кредит за машину' : 'Netflix, Vodafone, фитнес…'} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={type === 'debt' ? 'Платёж в месяц' : 'Сумма в месяц'}>
            <input className="field num !text-xl" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
          </Field>
          <Field label="Каждое … число">
            <div className="flex items-center gap-1">
              <button type="button" className="btn-soft !px-3.5 !py-3" onClick={() => { setDay(Math.max(1, day - 1)); setNext('') }}>−</button>
              <span className="num flex-1 text-center text-xl">{day}</span>
              <button type="button" className="btn-soft !px-3.5 !py-3" onClick={() => { setDay(Math.min(31, day + 1)); setNext('') }}>+</button>
            </div>
          </Field>
        </div>
        {type === 'debt' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Сумма кредита">
                <input className="field" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
              </Field>
              <Field label="Осталось выплатить">
                <input className="field" inputMode="decimal" placeholder="= сумме" value={remaining} onChange={(e) => setRemaining(e.target.value)} />
              </Field>
            </div>
            <Field label="Следующий платёж">
              <input className="field" type="date" value={next || upcomingDate()} onChange={(e) => { setNext(e.target.value); if (e.target.value) setDay(Number(e.target.value.slice(8))) }} />
            </Field>
          </>
        )}
        <Field label="Категория">
          <CategoryPicker value={category} onChange={(c) => { setCategory(c); if (!name.trim()) setName(c) }}
            groups={type === 'debt' ? ['credit'] : MANDATORY_GROUPS.filter((g) => g !== 'credit')} />
        </Field>
        <button className="btn w-full" type="submit" disabled={!valid}>{editing ? 'Сохранить' : 'Добавить'}</button>
        {reminder && (
          <a href={reminder} target="_blank" rel="noreferrer"
            className="btn-soft flex w-full items-center justify-center gap-2 text-center">
            <IconBell /> Напоминание в Google Календаре
          </a>
        )}
        {editing && (
          <DeleteButton label={type === 'debt' ? 'Удалить кредит' : 'Удалить платёж'} onDelete={() => {
            const before = data
            dispatch(spec.debt ? { type: 'deleteDebt', id: spec.debt.id } : { type: 'deleteBill', id: spec.bill!.id })
            toast('Удалено', before)
            onClose()
          }} />
        )}
      </form>
    </Sheet>
  )
}

/* ---------- Лимит ---------- */

const TOTAL = '__total__'

function LimitSheet({ item, onClose }: { item?: Limit; onClose: () => void }) {
  const { dispatch } = useStore()
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
    <Sheet title={item ? 'Лимит' : 'Новый лимит'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-1">
        <Field label="Сумма за период">
          <input className="field num !text-2xl" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        <Field label="На что">
          <button type="button" onClick={() => setTarget(TOTAL)} className={`chip mb-3 ${target === TOTAL ? 'chip-on' : ''}`}>💼 Все расходы</button>
          <CategoryPicker value={target} onChange={setTarget} groups={['daily', 'car', 'sport', 'other']} />
        </Field>
        <button className="btn w-full" type="submit" disabled={!(n > 0)}>Сохранить</button>
        {item && <DeleteButton label="Удалить лимит" onDelete={() => { dispatch({ type: 'deleteLimit', id: item.id }); onClose() }} />}
      </form>
    </Sheet>
  )
}

/* ---------- Сколько на счету ---------- */

function BalanceSheet({ onClose }: { onClose: () => void }) {
  const { dispatch, data } = useStore()
  const [amount, setAmount] = useState('')
  const n = parseAmount(amount || '0')
  return (
    <Sheet title="Сколько сейчас на счету?" onClose={onClose}>
      <p className="-mt-1 mb-3 text-sm text-ink2">Посмотрите в банковском приложении. Дальше остаток будет считаться сам по вашим записям.</p>
      <p className="num mb-3 text-center text-[40px]">{amountView(amount)} <span className="text-2xl">{data.settings.currency}</span></p>
      <div className="space-y-2 pb-1">
        <Keypad value={amount} onChange={setAmount} />
        <button type="button" className="btn w-full" onClick={() => { dispatch({ type: 'setSettings', patch: { balance: { amount: n, ts: Date.now() } } }); onClose() }}>
          Сохранить {fmtMoney(n)}
        </button>
        {data.settings.balance && (
          <button type="button" className="btn-soft w-full" onClick={() => { dispatch({ type: 'setSettings', patch: { balance: null } }); onClose() }}>
            Не вести остаток
          </button>
        )}
      </div>
    </Sheet>
  )
}

/* ---------- Зарплата ---------- */

export function SalarySheet({ onClose }: { onClose: () => void }) {
  const { dispatch, data } = useStore()
  const [day, setDay] = useState<number>(data.settings.payday ?? 15)
  const [salary, setSalary] = useState(numStr(data.settings.salary))
  const [currency, setCurrency] = useState(data.settings.currency)

  const save = () => {
    dispatch({ type: 'setSettings', patch: { payday: day, salary: parseAmount(salary || '0') || 0, currency } })
    onClose()
  }

  return (
    <Sheet title="Зарплата" onClose={onClose}>
      <div className="space-y-4 pb-1">
        <p className="-mt-1 text-sm text-ink2">План и бюджет считаются от зарплаты до зарплаты. Так понятно, сколько можно тратить до следующего поступления.</p>
        <Field label="Какого числа приходит">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button key={d} type="button" onClick={() => setDay(d)}
                className={`h-10 rounded-xl text-sm font-semibold ${day === d ? 'bg-ink text-white' : 'bg-soft'}`}>{d}</button>
            ))}
          </div>
        </Field>
        <Field label="Сколько примерно приходит">
          <input className="field num !text-2xl" inputMode="decimal" placeholder="0" value={salary} onChange={(e) => setSalary(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        <Field label="Валюта">
          <div className="flex flex-wrap gap-1.5">
            {CURRENCIES.map((c) => (
              <button key={c.symbol} type="button" onClick={() => setCurrency(c.symbol)} className={`chip ${currency === c.symbol ? 'chip-on' : ''}`}>{c.symbol} {c.label}</button>
            ))}
          </div>
        </Field>
        <button type="button" className="btn w-full" onClick={save}>Сохранить</button>
        {data.settings.payday && (
          <button type="button" className="btn-soft w-full" onClick={() => { dispatch({ type: 'setSettings', patch: { payday: null, salary: 0 } }); onClose() }}>
            Считать по календарным месяцам
          </button>
        )}
      </div>
    </Sheet>
  )
}

