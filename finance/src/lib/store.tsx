import {
  createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode,
} from 'react'
import type { AppData, Bill, Category, Credit, Expense, Income, PlanShares, Settings } from './types'
import { monthOf, setCurrency } from './format'
import { DEFAULT_CATEGORIES } from './categories'
import { DEFAULT_PLAN } from './calc'

/* Версия 4 начинается с чистого листа: старые ключи не читаются */
const KEY = 'finance-app:v4'
const OLD_KEYS = ['finance-app:v1']
const DOC_PREFIX = 'v4-'

const DEFAULT_SETTINGS: Settings = { currency: '€', paydays: [], plan: DEFAULT_PLAN, balance: null }

export const emptyData = (): AppData => ({
  version: 4, updatedAt: 0,
  incomes: [], expenses: [], bills: [], credits: [],
  categories: DEFAULT_CATEGORIES,
  settings: DEFAULT_SETTINGS,
})

export const hasContent = (d: AppData) =>
  d.incomes.length + d.expenses.length + d.bills.length + d.credits.length + d.settings.paydays.length > 0

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Проверяет и дополняет данные версии 4 (из облака, браузера или резервной копии) */
export function normalize(raw: any): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object' || raw.version !== 4) return base
  const arr = (x: any) => (Array.isArray(x) ? x : [])
  const categories: Category[] = arr(raw.categories).length ? [...raw.categories] : [...DEFAULT_CATEGORIES]
  for (const c of DEFAULT_CATEGORIES) if (!categories.some((x) => x.name === c.name)) categories.push(c)
  return {
    version: 4,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    incomes: arr(raw.incomes), expenses: arr(raw.expenses), bills: arr(raw.bills), credits: arr(raw.credits),
    categories,
    settings: { ...DEFAULT_SETTINGS, ...raw.settings, paydays: arr(raw.settings?.paydays), plan: { ...DEFAULT_PLAN, ...raw.settings?.plan } },
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function loadLocal(): AppData {
  try {
    for (const k of OLD_KEYS) localStorage.removeItem(k)
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* хранилище недоступно */
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
  | { type: 'saveBill'; item: Bill }
  | { type: 'deleteBill'; id: string }
  | { type: 'saveCredit'; item: Credit }
  | { type: 'deleteCredit'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'setPlan'; plan: PlanShares }
  | { type: 'replaceAll'; data: AppData }

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

function apply(s: AppData, a: Action): AppData {
  switch (a.type) {
    case 'addIncome': return { ...s, incomes: [a.item, ...s.incomes] }
    case 'updateIncome': return { ...s, incomes: s.incomes.map((i) => (i.id === a.item.id ? a.item : i)) }
    case 'deleteIncome': return { ...s, incomes: s.incomes.filter((i) => i.id !== a.id) }
    case 'addExpense': return { ...s, expenses: [a.item, ...s.expenses] }
    case 'updateExpense': return { ...s, expenses: s.expenses.map((e) => (e.id === a.item.id ? a.item : e)) }
    case 'deleteExpense': return { ...s, expenses: s.expenses.filter((e) => e.id !== a.id) }
    case 'addCategory':
      return s.categories.some((c) => c.name === a.item.name) ? s : { ...s, categories: [...s.categories, a.item] }
    case 'deleteCategory': return { ...s, categories: s.categories.filter((c) => c.name !== a.name) }
    case 'saveBill': return { ...s, bills: upsert(s.bills, a.item) }
    case 'deleteBill': return { ...s, bills: s.bills.filter((b) => b.id !== a.id) }
    case 'saveCredit': return { ...s, credits: upsert(s.credits, a.item) }
    case 'deleteCredit': return { ...s, credits: s.credits.filter((c) => c.id !== a.id) }
    case 'setSettings': return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'setPlan': return { ...s, settings: { ...s.settings, plan: a.plan } }
    case 'replaceAll': return a.data
  }
}

type Stamped = { action: Action; now: number }

function reducer(s: AppData, { action, now }: Stamped): AppData {
  const next = apply(s, action)
  if (next === s) return s
  return action.type === 'replaceAll' ? next : { ...next, updatedAt: now }
}

/* ---------- Облако: личное хранилище пользователя в базе артефакта ---------- */

/*
 *   data/users/<id>/v4-state        — платежи, кредиты, зарплаты, категории, настройки
 *   data/users/<id>/v4-m-YYYY-MM    — доходы и расходы одного месяца
 */
type Docs = Record<string, Record<string, unknown>>

function toDocs(d: AppData): Docs {
  const docs: Docs = {
    [`${DOC_PREFIX}state`]: { version: d.version, updatedAt: d.updatedAt, bills: d.bills, credits: d.credits, categories: d.categories, settings: d.settings },
  }
  const month = (ym: string) => (docs[`${DOC_PREFIX}m-${ym}`] ??= { incomes: [], expenses: [] }) as { incomes: Income[]; expenses: Expense[] }
  for (const i of d.incomes) month(monthOf(i.date)).incomes.push(i)
  for (const e of d.expenses) month(monthOf(e.date)).expenses.push(e)
  return docs
}

function fromDocs(snap: ClaudeQuerySnap): AppData | null {
  const state = snap.docs.find((x) => x.id === `${DOC_PREFIX}state`)?.data()
  if (!state) return null
  const incomes: Income[] = []
  const expenses: Expense[] = []
  for (const doc of snap.docs) {
    if (!doc.id.startsWith(`${DOC_PREFIX}m-`)) continue
    const body = doc.data() as { incomes?: Income[]; expenses?: Expense[] } | undefined
    incomes.push(...(body?.incomes ?? []))
    expenses.push(...(body?.expenses ?? []))
  }
  return normalize({ ...state, incomes, expenses })
}

export type SyncStatus = 'connecting' | 'cloud' | 'saving' | 'local' | 'error'

interface Store { data: AppData; dispatch: (a: Action) => void; sync: SyncStatus }

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, undefined, loadLocal)
  const [sync, setSync] = useState<SyncStatus>('connecting')
  setCurrency(data.settings.currency)

  const dispatch = useCallback((action: Action) => rawDispatch({ action, now: Date.now() }), [])

  const coll = useRef<ClaudeCollectionRef | null>(null)
  const written = useRef<Record<string, string>>({})
  const ready = useRef(false)
  const latest = useRef(data)
  latest.current = data

  useEffect(() => { saveLocal(data) }, [data])

  // Запись в облако: только изменившиеся документы, по одному, после паузы
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
        for (const id of Object.keys(written.current)) if (!docs[id] && id.startsWith(`${DOC_PREFIX}m-`)) docs[id] = { incomes: [], expenses: [] }
        const changed = Object.keys(docs)
          .filter((id) => written.current[id] !== JSON.stringify(docs[id]))
          .sort((a) => (a.endsWith('state') ? 1 : -1))
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
          if (!ready.current && snap.metadata.fromCache && snap.empty) return
          const remote = fromDocs(snap)
          if (remote) {
            for (const [docId, body] of Object.entries(toDocs(remote))) written.current[docId] = JSON.stringify(body)
            for (const d of snap.docs) if (d.id.startsWith(`${DOC_PREFIX}m-`)) written.current[d.id] ??= JSON.stringify(d.data())
          }
          const local = latest.current
          const first = !ready.current
          ready.current = true
          if (remote && remote.updatedAt > local.updatedAt) {
            rawDispatch({ action: { type: 'replaceAll', data: remote }, now: Date.now() })
            setSync('cloud')
          } else if (!remote && hasContent(local)) {
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
