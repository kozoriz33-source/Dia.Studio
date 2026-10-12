import {
  createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode,
} from 'react'
import type { AppData, Bill, Category, Debt, Expense, Income, Limit, PlanShares, Settings } from './types'
import { addMonths, monthOf, setCurrency, uid } from './format'
import { DEFAULT_CATEGORIES, LEGACY_CATEGORIES } from './categories'
import { DEFAULT_PLAN } from './plan'

const KEY = 'finance-app:v1'

const DEFAULT_SETTINGS: Settings = { currency: '€', plan: DEFAULT_PLAN, payday: null, salary: 0, balance: null }

const emptyData = (): AppData => ({
  version: 3, updatedAt: 0,
  incomes: [], expenses: [], debts: [], bills: [], limits: [],
  categories: DEFAULT_CATEGORIES,
  settings: DEFAULT_SETTINGS,
})

export const hasContent = (d: AppData) =>
  d.incomes.length + d.expenses.length + d.debts.length + d.bills.length + d.limits.length > 0

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Приводит сохранённые данные любой версии к текущему формату, ничего не теряя */
export function migrate(raw: any): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  let d: any = raw

  if (!d.version) {
    // v1: категории — строки, платежи по долгам не были расходами
    let expenses: Expense[] = Array.isArray(d.expenses) ? d.expenses : []
    const limits: Limit[] = Array.isArray(d.limits) ? d.limits : []
    const used = new Set<string>([...expenses.map((e) => e.category), ...limits.map((l) => l.category).filter((c): c is string => !!c)])
    const oldNames: string[] = Array.isArray(d.categories) ? d.categories.filter((c: any) => typeof c === 'string') : []
    const v1Defaults = ['Продукты', 'Транспорт', 'Жильё', 'Здоровье', 'Развлечения', 'Одежда', 'Связь', 'Прочее']
    const categories: Category[] = [...DEFAULT_CATEGORIES]
    for (const name of new Set([...oldNames, ...used])) {
      if (categories.some((c) => c.name === name)) continue
      if (v1Defaults.includes(name) && !used.has(name)) continue
      categories.push(LEGACY_CATEGORIES[name] ?? { name, group: 'other', icon: '📦' })
    }
    const debts: Debt[] = (Array.isArray(d.debts) ? d.debts : []).map((x: any) => {
      const category = categories.find((c) => c.group === 'credit' && c.name.toLowerCase() === String(x.name).trim().toLowerCase())?.name ?? 'Кредит'
      return {
        ...x, category,
        payments: (x.payments ?? []).map((p: any) => {
          const id = uid()
          expenses = [...expenses, { id, amount: p.amount, category, date: p.date, note: x.name, debtId: x.id }]
          return { ...p, expenseId: id }
        }),
      }
    })
    d = { version: 2, incomes: Array.isArray(d.incomes) ? d.incomes : [], expenses, debts, limits, categories, bills: [], settings: {} }
  }

  // v2 → v3: новые категории и настройки зарплаты/остатка
  const categories: Category[] = Array.isArray(d.categories) ? [...d.categories] : [...DEFAULT_CATEGORIES]
  for (const c of DEFAULT_CATEGORIES) if (!categories.some((x) => x.name === c.name)) categories.push(c)
  for (const c of categories) if (c.name === 'Здоровье' && c.group === 'daily') c.group = 'sport'

  return {
    ...base,
    incomes: d.incomes ?? [], expenses: d.expenses ?? [], debts: d.debts ?? [], bills: d.bills ?? [], limits: d.limits ?? [],
    categories,
    settings: { ...DEFAULT_SETTINGS, ...d.settings, plan: { ...DEFAULT_PLAN, ...d.settings?.plan } },
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0,
    version: 3,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    /* повреждённые данные или недоступное хранилище */
  }
  return emptyData()
}

function saveLocal(d: AppData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* квота/приватный режим */ }
}

/* ---------- Действия ---------- */

export type Action =
  | { type: 'addIncome'; item: Income }
  | { type: 'updateIncome'; item: Income }
  | { type: 'deleteIncome'; id: string }
  | { type: 'addExpense'; item: Expense }
  | { type: 'updateExpense'; item: Expense }
  | { type: 'deleteExpense'; id: string }
  | { type: 'addCategory'; item: Category }
  | { type: 'deleteCategory'; name: string }
  | { type: 'addDebt'; item: Debt }
  | { type: 'updateDebt'; item: Debt }
  | { type: 'deleteDebt'; id: string }
  | { type: 'payDebt'; id: string; expenseId: string; date: string; ts: number }
  | { type: 'addBill'; item: Bill }
  | { type: 'updateBill'; item: Bill }
  | { type: 'deleteBill'; id: string }
  | { type: 'setLimit'; item: Limit }
  | { type: 'deleteLimit'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'setPlan'; plan: PlanShares }
  | { type: 'replaceAll'; data: AppData }

const mapDebt = (s: AppData, id: string | undefined, f: (d: Debt) => Debt) =>
  s.debts.map((d) => (d.id === id ? f(d) : d))

function apply(s: AppData, a: Action): AppData {
  switch (a.type) {
    case 'addIncome': return { ...s, incomes: [a.item, ...s.incomes] }
    case 'updateIncome': return { ...s, incomes: s.incomes.map((i) => (i.id === a.item.id ? a.item : i)) }
    case 'deleteIncome': return { ...s, incomes: s.incomes.filter((i) => i.id !== a.id) }

    case 'addExpense': return { ...s, expenses: [a.item, ...s.expenses] }
    case 'updateExpense': {
      const old = s.expenses.find((e) => e.id === a.item.id)
      if (!old) return s
      const diff = a.item.amount - old.amount
      return {
        ...s,
        expenses: s.expenses.map((e) => (e.id === a.item.id ? a.item : e)),
        debts: mapDebt(s, old.debtId, (d) => ({
          ...d,
          remaining: Math.max(0, Math.min(d.total, d.remaining - diff)),
          payments: d.payments.map((p) => (p.expenseId === old.id ? { ...p, amount: a.item.amount, date: a.item.date } : p)),
        })),
      }
    }
    case 'deleteExpense': {
      const old = s.expenses.find((e) => e.id === a.id)
      if (!old) return s
      return {
        ...s,
        expenses: s.expenses.filter((e) => e.id !== a.id),
        // удалили платёж по кредиту — возвращаем долг и дату платежа
        debts: mapDebt(s, old.debtId, (d) => ({
          ...d,
          remaining: Math.min(d.total, d.remaining + old.amount),
          nextPaymentDate: addMonths(d.nextPaymentDate, -1),
          payments: d.payments.filter((p) => p.expenseId !== old.id),
        })),
      }
    }

    case 'addCategory':
      return s.categories.some((c) => c.name === a.item.name) ? s : { ...s, categories: [...s.categories, a.item] }
    case 'deleteCategory': return { ...s, categories: s.categories.filter((c) => c.name !== a.name) }

    case 'addDebt': return { ...s, debts: [...s.debts, a.item] }
    case 'updateDebt': return { ...s, debts: s.debts.map((d) => (d.id === a.item.id ? a.item : d)) }
    case 'deleteDebt': return { ...s, debts: s.debts.filter((d) => d.id !== a.id) }
    case 'payDebt': {
      const d = s.debts.find((x) => x.id === a.id)
      if (!d || d.remaining <= 0) return s
      const amount = Math.min(d.monthlyPayment, d.remaining)
      return {
        ...s,
        expenses: [{ id: a.expenseId, amount, category: d.category, date: a.date, note: d.name, debtId: d.id, ts: a.ts }, ...s.expenses],
        debts: mapDebt(s, d.id, (x) => ({
          ...x,
          remaining: x.remaining - amount,
          nextPaymentDate: addMonths(x.nextPaymentDate, 1),
          payments: [...x.payments, { date: a.date, amount, expenseId: a.expenseId }],
        })),
      }
    }

    case 'addBill': return { ...s, bills: [...s.bills, a.item] }
    case 'updateBill': return { ...s, bills: s.bills.map((b) => (b.id === a.item.id ? a.item : b)) }
    case 'deleteBill': return { ...s, bills: s.bills.filter((b) => b.id !== a.id) }

    case 'setLimit': {
      const rest = s.limits.filter((l) => l.id !== a.item.id && l.category !== a.item.category)
      return { ...s, limits: [...rest, a.item] }
    }
    case 'deleteLimit': return { ...s, limits: s.limits.filter((l) => l.id !== a.id) }

    case 'setSettings': return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'setPlan': return { ...s, settings: { ...s.settings, plan: a.plan } }
    case 'replaceAll': return a.data
  }
}

/** Отметка времени ставится в dispatch, чтобы редьюсер оставался чистым */
type Stamped = { action: Action; now: number }

function reducer(s: AppData, { action, now }: Stamped): AppData {
  const next = apply(s, action)
  if (next === s) return s
  return action.type === 'replaceAll' ? next : { ...next, updatedAt: now }
}

/* ---------- Облако: база артефакта (db) ---------- */

/*
 * Раскладка в базе (личное пространство пользователя, видно только ему):
 *   data/users/<id>/state      — настройки, платежи, кредиты, категории, лимиты
 *   data/users/<id>/m-YYYY-MM  — доходы и расходы одного месяца
 * Так ни один документ не упирается в лимит 256 КБ.
 */
type Docs = Record<string, Record<string, unknown>>

function toDocs(d: AppData): Docs {
  const docs: Docs = {
    state: {
      version: d.version, updatedAt: d.updatedAt, debts: d.debts, bills: d.bills,
      limits: d.limits, categories: d.categories, settings: d.settings,
    },
  }
  const month = (ym: string) => (docs[`m-${ym}`] ??= { incomes: [], expenses: [] }) as { incomes: Income[]; expenses: Expense[] }
  for (const i of d.incomes) month(monthOf(i.date)).incomes.push(i)
  for (const e of d.expenses) month(monthOf(e.date)).expenses.push(e)
  return docs
}

function fromDocs(snap: ClaudeQuerySnap): AppData | null {
  const state = snap.docs.find((x) => x.id === 'state')?.data()
  if (!state) return null
  const incomes: Income[] = []
  const expenses: Expense[] = []
  for (const doc of snap.docs) {
    if (!doc.id.startsWith('m-')) continue
    const body = doc.data() as { incomes?: Income[]; expenses?: Expense[] } | undefined
    incomes.push(...(body?.incomes ?? []))
    expenses.push(...(body?.expenses ?? []))
  }
  return migrate({ ...state, incomes, expenses })
}

export type SyncStatus = 'connecting' | 'cloud' | 'saving' | 'local' | 'error'

/* ---------- Провайдер ---------- */

interface Store {
  data: AppData
  dispatch: (a: Action) => void
  sync: SyncStatus
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, undefined, loadLocal)
  const [sync, setSync] = useState<SyncStatus>('connecting')
  setCurrency(data.settings.currency)

  const dispatch = useCallback((action: Action) => rawDispatch({ action, now: Date.now() }), [])

  const coll = useRef<ClaudeCollectionRef | null>(null)
  const written = useRef<Record<string, string>>({}) // последнее записанное содержимое документов
  const ready = useRef(false) // первый снимок из облака получен
  const latest = useRef(data)
  latest.current = data

  // Локальная копия — всегда, мгновенно
  useEffect(() => { saveLocal(data) }, [data])

  // Запись в облако: только изменившиеся документы, по одному, с паузой на серию правок
  const writing = useRef(false)
  const again = useRef(false)
  const flush = useCallback(async () => {
    if (!coll.current || !ready.current) return
    if (writing.current) { again.current = true; return }
    writing.current = true
    try {
      do {
        again.current = false
        const docs = toDocs(latest.current)
        // известные документы, которые опустели, перезаписываем пустыми
        for (const id of Object.keys(written.current)) if (!docs[id] && id.startsWith('m-')) docs[id] = { incomes: [], expenses: [] }
        const changed = Object.keys(docs)
          .filter((id) => written.current[id] !== JSON.stringify(docs[id]))
          .sort((a) => (a === 'state' ? 1 : -1)) // state последним
        if (changed.length) setSync('saving')
        for (const id of changed) {
          const json = JSON.stringify(docs[id])
          await coll.current.doc(id).set(docs[id])
          written.current[id] = json
        }
      } while (again.current)
      setSync('cloud')
    } catch {
      setSync('error')
    } finally {
      writing.current = false
    }
  }, [])

  useEffect(() => {
    if (!ready.current) return
    const t = setTimeout(flush, 400)
    return () => clearTimeout(t)
  }, [data, flush])

  // Подключение к облаку
  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      const c = window.claude
      if (!c) { setSync('local'); return }
      const [db, user] = await Promise.all([c.use('db'), c.use('user')])
      const id = user ? await user.id() : null
      if (cancelled) return
      if (!db || !id) { setSync('local'); return }
      coll.current = db.collection(`data/users/${id}`)
      unsub = coll.current.onSnapshot(
        (snap) => {
          if (snap.metadata.hasPendingWrites) return
          if (!ready.current && snap.metadata.fromCache && snap.empty) return // ждём ответа сервера
          const remote = fromDocs(snap)
          if (remote) {
            for (const [docId, body] of Object.entries(toDocs(remote))) written.current[docId] = JSON.stringify(body)
            for (const d of snap.docs) if (d.id.startsWith('m-')) written.current[d.id] ??= JSON.stringify(d.data())
          }
          const local = latest.current
          const first = !ready.current
          ready.current = true
          if (remote && remote.updatedAt > local.updatedAt) {
            rawDispatch({ action: { type: 'replaceAll', data: remote }, now: Date.now() })
            setSync('cloud')
          } else if (!remote && hasContent(local)) {
            // облако пустое — переносим туда то, что было в браузере
            void flush()
          } else if (first) {
            if (remote && local.updatedAt > remote.updatedAt) void flush()
            else setSync('cloud')
          }
        },
        () => setSync('error'),
      )
    })().catch(() => setSync('local'))
    return () => { cancelled = true; unsub?.() }
  }, [flush])

  return <Ctx.Provider value={{ data, dispatch, sync }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore outside StoreProvider')
  return c
}
