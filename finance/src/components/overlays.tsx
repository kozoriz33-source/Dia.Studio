import { createContext, useCallback, useContext, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { AppData, Bill, Credit, Payday } from '../lib/types'
import { addMonthsYM, dayLabel, dueDate, fmtMoney, monthOf, parseAmount, shiftDays, todayISO, uid, CURRENCIES } from '../lib/format'
import { BILL_GROUPS, GROUPS, GROUP_ORDER, catInfo } from '../lib/categories'
import { creditLeft, creditNext, creditMonthsLeft, topCategories, type Operation } from '../lib/calc'
import { useStore } from '../lib/store'
import { CatIcon, DeleteButton, Field, Segmented, Sheet } from './ui'
import { IconBackspace, IconBell } from './icons'

export type Overlay =
  | { kind: 'quick'; mode?: 'expense' | 'income'; category?: string }
  | { kind: 'edit'; op: Operation }
  | { kind: 'bill'; item?: Bill; preset?: { name: string; category: string } }
  | { kind: 'credit'; item?: Credit; preset?: { name: string; category: string } }
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
      {overlay?.kind === 'bill' && <BillSheet item={overlay.item} preset={overlay.preset} onClose={close} />}
      {overlay?.kind === 'credit' && <CreditSheet item={overlay.item} preset={overlay.preset} onClose={close} />}
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
    const list = [...data.settings.paydays.map((p) => p.name), ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)]
    for (const s of ['Зарплата', 'Аванс', 'Подработка', 'Возврат долга']) if (!list.includes(s)) list.push(s)
    return [...new Set(list)].slice(0, 6)
  }, [data.incomes, data.settings.paydays])

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

/* ---------- Исправить запись ---------- */

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
    if (isExp) dispatch({ type: 'updateExpense', item: { id: op.id, amount: n, category, date, note: note.trim(), ts: op.ts } })
    else dispatch({ type: 'updateIncome', item: { id: op.id, amount: n, source: source.trim(), date, note: note.trim(), ts: op.ts } })
    toast('Сохранено', before)
    onClose()
  }

  return (
    <Sheet title={isExp ? 'Расход' : 'Доход'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-1">
        <Field label="Дата"><DateField value={date} onChange={setDate} /></Field>
        <Field label="Сумма">
          <input className="field num !text-2xl" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
        </Field>
        {isExp
          ? <Field label="Категория"><CategoryPicker value={category} onChange={setCategory} /></Field>
          : <Field label="Откуда"><input className="field" value={source} onChange={(e) => setSource(e.target.value)} /></Field>}
        <Field label="Заметка">
          <input className="field" placeholder="Необязательно" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
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

/* ---------- Общие поля платежей ---------- */

function DayStepper({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn-soft !px-4 !py-3" onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <span className="num flex-1 text-center text-xl">{value}</span>
      <button type="button" className="btn-soft !px-4 !py-3" onClick={() => onChange(Math.min(31, value + 1))}>+</button>
    </div>
  )
}

/** С какой зарплаты платить (показываем, когда зарплат больше одной) */
function FundingPicker({ value, onChange }: { value?: number; onChange: (d?: number) => void }) {
  const { data } = useStore()
  const days = [...data.settings.paydays].sort((a, b) => a.day - b.day)
  if (days.length < 2) return null
  return (
    <Field label="С какой зарплаты платить">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onChange(undefined)} className={`chip ${value === undefined ? 'chip-on' : ''}`}>Сам решит</button>
        {days.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(p.day)} className={`chip ${value === p.day ? 'chip-on' : ''}`}>
            {p.name} {p.day}-го
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-ink3">«Сам решит» — с последней зарплаты, которая приходит до платежа.</p>
    </Field>
  )
}

/** Ссылка на ежемесячное напоминание в Google Календаре */
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

const nextDue = (day: number) => {
  const t = todayISO()
  const d = dueDate(monthOf(t), day)
  return d >= t ? d : dueDate(addMonthsYM(monthOf(t), 1), day)
}

const Reminder = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="btn-soft flex w-full items-center justify-center gap-2">
    <IconBell /> Напоминание в Google Календаре
  </a>
)

/* ---------- Обязательный платёж ---------- */

function BillSheet({ item, preset, onClose }: { item?: Bill; preset?: { name: string; category: string }; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const { toast } = useUI()
  const [name, setName] = useState(item?.name ?? preset?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? preset?.category ?? 'Другая подписка')
  const [amount, setAmount] = useState(numStr(item?.amount))
  const [day, setDay] = useState(item?.day ?? 1)
  const [fromDay, setFromDay] = useState(item?.fromDay)
  const n = parseAmount(amount)
  const valid = !!name.trim() && n > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const before = data
    dispatch({ type: 'saveBill', item: { id: item?.id ?? uid(), name: name.trim(), category, amount: n, day, ...(fromDay && { fromDay }) } })
    toast(item ? 'Сохранено' : `Добавлено: ${name.trim()}`, before)
    onClose()
  }

  return (
    <Sheet title={item ? item.name : 'Обязательный платёж'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-1">
        <Field label="Название">
          <input className="field" placeholder="Квартира, Vodafone, фитнес…" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сумма в месяц">
            <input className="field num !text-xl" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
          </Field>
          <Field label="Списывается числа"><DayStepper value={day} onChange={setDay} /></Field>
        </div>
        <FundingPicker value={fromDay} onChange={setFromDay} />
        <Field label="Категория">
          <CategoryPicker value={category} onChange={(c) => { setCategory(c); if (!name.trim()) setName(c) }} groups={BILL_GROUPS} />
        </Field>
        <button className="btn w-full" type="submit" disabled={!valid}>{item ? 'Сохранить' : 'Добавить'}</button>
        {item && <Reminder href={calendarLink(item.name, nextDue(item.day))} />}
        {item && (
          <DeleteButton label="Удалить платёж" onDelete={() => {
            const before = data
            dispatch({ type: 'deleteBill', id: item.id })
            toast('Удалено', before)
            onClose()
          }} />
        )}
      </form>
    </Sheet>
  )
}

/* ---------- Кредит ---------- */

function CreditSheet({ item, preset, onClose }: { item?: Credit; preset?: { name: string; category: string }; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const { toast } = useUI()
  const [name, setName] = useState(item?.name ?? preset?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? preset?.category ?? 'Кредит')
  const [monthly, setMonthly] = useState(numStr(item?.monthly))
  const [day, setDay] = useState(item?.day ?? 1)
  const [left, setLeft] = useState(numStr(item ? creditLeft(item) : undefined))
  const [fromDay, setFromDay] = useState(item?.fromDay)
  const m = parseAmount(monthly)
  const l = parseAmount(left)
  const valid = !!name.trim() && m > 0 && l >= 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const before = data
    // остаток указан «на сегодня»: платежи до сегодняшнего дня включительно уже учтены
    dispatch({ type: 'saveCredit', item: { id: item?.id ?? uid(), name: name.trim(), category, monthly: m, day, remaining: l, asOf: todayISO(), ...(fromDay && { fromDay }) } })
    toast(item ? 'Сохранено' : `Добавлено: ${name.trim()}`, before)
    onClose()
  }

  const months = m > 0 && l > 0 ? Math.ceil(l / m - 1e-9) : 0
  const next = item ? creditNext(item) : null

  return (
    <Sheet title={item ? item.name : 'Кредит'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-1">
        <Field label="Название">
          <input className="field" placeholder="Кредит за машину" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Платёж в месяц">
            <input className="field num !text-xl" inputMode="decimal" placeholder="0" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d.,]/g, ''))} />
          </Field>
          <Field label="Списывается числа"><DayStepper value={day} onChange={setDay} /></Field>
        </div>
        <Field label="Сколько осталось выплатить сейчас">
          <input className="field num !text-xl" inputMode="decimal" placeholder="0" value={left} onChange={(e) => setLeft(e.target.value.replace(/[^\d.,]/g, ''))} />
          {months > 0 && <p className="mt-1.5 text-[13px] text-ink2">≈ {months} мес. платежей. Остаток будет уменьшаться сам каждый месяц.</p>}
        </Field>
        <FundingPicker value={fromDay} onChange={setFromDay} />
        <Field label="Категория">
          <div className="flex flex-wrap gap-1.5">
            {data.categories.filter((c) => c.group === 'credit').map((c) => (
              <button key={c.name} type="button" onClick={() => setCategory(c.name)} className={`chip ${category === c.name ? 'chip-on' : ''}`}>{c.icon} {c.name}</button>
            ))}
          </div>
        </Field>
        <button className="btn w-full" type="submit" disabled={!valid}>{item ? 'Сохранить' : 'Добавить кредит'}</button>
        {item && next && <Reminder href={calendarLink(item.name, next.date, creditMonthsLeft(item))} />}
        {item && (
          <DeleteButton label="Удалить кредит" onDelete={() => {
            const before = data
            dispatch({ type: 'deleteCredit', id: item.id })
            toast('Удалено', before)
            onClose()
          }} />
        )}
      </form>
    </Sheet>
  )
}

/* ---------- Сколько на руках ---------- */

function BalanceSheet({ onClose }: { onClose: () => void }) {
  const { dispatch, data } = useStore()
  const [amount, setAmount] = useState('')
  const n = parseAmount(amount || '0')
  return (
    <Sheet title="Сколько сейчас на руках?" onClose={onClose}>
      <p className="-mt-1 mb-3 text-sm text-ink2">Все деньги на картах и наличными. Если ничего нет, оставьте 0. Дальше сумма будет считаться сама.</p>
      <p className="num mb-3 text-center text-[40px]">{amountView(amount)} <span className="text-2xl">{data.settings.currency}</span></p>
      <div className="space-y-2 pb-1">
        <Keypad value={amount} onChange={setAmount} />
        <button type="button" className="btn w-full" onClick={() => { dispatch({ type: 'setSettings', patch: { balance: { amount: n, ts: Date.now() } } }); onClose() }}>
          Сохранить {fmtMoney(n)}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------- Зарплаты ---------- */

type PaydayDraft = { id: string; name: string; day: number; amount: string }

function SalarySheet({ onClose }: { onClose: () => void }) {
  const { dispatch, data } = useStore()
  const { toast } = useUI()
  const [rows, setRows] = useState<PaydayDraft[]>(
    data.settings.paydays.length
      ? [...data.settings.paydays].sort((a, b) => a.day - b.day).map((p) => ({ ...p, amount: numStr(p.amount) }))
      : [{ id: uid(), name: 'Зарплата', day: 15, amount: '' }],
  )
  const [currency, setCurrency] = useState(data.settings.currency)
  const set = (id: string, patch: Partial<PaydayDraft>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const save = () => {
    const paydays: Payday[] = rows
      .map((r) => ({ id: r.id, name: r.name.trim() || 'Зарплата', day: r.day, amount: parseAmount(r.amount || '0') || 0 }))
      .filter((p) => p.amount > 0)
    dispatch({ type: 'setSettings', patch: { paydays, currency } })
    toast('Зарплаты сохранены')
    onClose()
  }

  return (
    <Sheet title="Мои зарплаты" onClose={onClose}>
      <div className="space-y-3 pb-1">
        <p className="-mt-1 text-sm text-ink2">Укажите все поступления: например, 1-го одна сумма, 15-го другая.</p>
        {rows.map((r, i) => (
          <div key={r.id} className="space-y-2 rounded-2xl bg-soft p-3">
            <div className="flex items-center gap-2">
              <input className="field !bg-white !py-2" value={r.name} placeholder="Зарплата" onChange={(e) => set(r.id, { name: e.target.value })} />
              {rows.length > 1 && (
                <button type="button" aria-label="Убрать" onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink2">✕</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Сумма">
                <input className="field num !bg-white !text-lg" inputMode="decimal" placeholder="0" value={r.amount} autoFocus={i === 0 && !r.amount}
                  onChange={(e) => set(r.id, { amount: e.target.value.replace(/[^\d.,]/g, '') })} />
              </Field>
              <Field label="Приходит числа">
                <div className="flex items-center gap-1">
                  <button type="button" className="h-11 w-10 rounded-xl bg-white font-bold" onClick={() => set(r.id, { day: Math.max(1, r.day - 1) })}>−</button>
                  <span className="num flex-1 text-center text-lg">{r.day}</span>
                  <button type="button" className="h-11 w-10 rounded-xl bg-white font-bold" onClick={() => set(r.id, { day: Math.min(31, r.day + 1) })}>+</button>
                </div>
              </Field>
            </div>
          </div>
        ))}
        {rows.length < 4 && (
          <button type="button" className="btn-soft w-full" onClick={() => setRows([...rows, { id: uid(), name: rows.length ? 'Аванс' : 'Зарплата', day: 1, amount: '' }])}>
            + Ещё одно поступление
          </button>
        )}
        <Field label="Валюта">
          <div className="flex flex-wrap gap-1.5">
            {CURRENCIES.map((c) => (
              <button key={c.symbol} type="button" onClick={() => setCurrency(c.symbol)} className={`chip ${currency === c.symbol ? 'chip-on' : ''}`}>{c.symbol} {c.label}</button>
            ))}
          </div>
        </Field>
        <button type="button" className="btn w-full" onClick={save}>Сохранить</button>
      </div>
    </Sheet>
  )
}
