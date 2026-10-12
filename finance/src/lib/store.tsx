import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { AppData, Bill, Category, Debt, Expense, Income, Limit, PlanShares } from './types'
import { addMonths, setCurrency, uid } from './format'
import { DEFAULT_CATEGORIES, LEGACY_CATEGORIES } from './categories'
import { DEFAULT_PLAN } from './plan'

const KEY = 'finance-app:v1'

const emptyData = (): AppData => ({
  version: 2,
  incomes: [], expenses: [], debts: [], bills: [], limits: [],
  categories: DEFAULT_CATEGORIES,
  settings: { currency: '€', plan: DEFAULT_PLAN },
})

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Приводит сохранённые данные любой версии к текущему формату, ничего не теряя */
export function migrate(raw: any): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  if (raw.version === 2) {
    return { ...base, ...raw, settings: { ...base.settings, ...raw.settings, plan: { ...DEFAULT_PLAN, ...raw.settings?.plan } } }
  }

  // v1: категории — строки, платежи по долгам не были расходами
  let expenses: Expense[] = Array.isArray(raw.expenses) ? raw.expenses : []
  const limits: Limit[] = Array.isArray(raw.limits) ? raw.limits : []
  const used = new Set<string>([
    ...expenses.map((e) => e.category),
    ...limits.map((l) => l.category).filter((c): c is string => !!c),
  ])
  const oldNames: string[] = Array.isArray(raw.categories) ? raw.categories.filter((c: any) => typeof c === 'string') : []
  const v1Defaults = ['Продукты', 'Транспорт', 'Жильё', 'Здоровье', 'Развлечения', 'Одежда', 'Связь', 'Прочее']
  const categories: Category[] = [...DEFAULT_CATEGORIES]
  for (const name of new Set([...oldNames, ...used])) {
    if (categories.some((c) => c.name === name)) continue
    if (v1Defaults.includes(name) && !used.has(name)) continue // неиспользованные старые — не тащим
    categories.push(LEGACY_CATEGORIES[name] ?? { name, group: 'other', icon: '📦' })
  }

  const debts: Debt[] = (Array.isArray(raw.debts) ? raw.debts : []).map((d: any) => {
    // «Кредит за машину» → одноимённая категория, иначе общая «Кредит»
    const category = categories.find((c) => c.group === 'credit' && c.name.toLowerCase() === String(d.name).trim().toLowerCase())?.name ?? 'Кредит'
    return {
      ...d,
      category,
      payments: (d.payments ?? []).map((p: any) => {
        const id = uid()
        expenses = [...expenses, { id, amount: p.amount, category, date: p.date, note: d.name, debtId: d.id }]
        return { ...p, expenseId: id }
      }),
    }
  })

  return {
    ...base,
    incomes: Array.isArray(raw.incomes) ? raw.incomes : [],
    expenses, debts, limits, categories,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    /* повреждённые данные или недоступное хранилище — начинаем с нуля */
  }
  return emptyData()
}

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
  | { type: 'payDebt'; id: string; expenseId: string; date: string }
  | { type: 'addBill'; item: Bill }
  | { type: 'updateBill'; item: Bill }
  | { type: 'deleteBill'; id: string }
  | { type: 'setLimit'; item: Limit }
  | { type: 'deleteLimit'; id: string }
  | { type: 'setCurrency'; currency: string }
  | { type: 'setPlan'; plan: PlanShares }
  | { type: 'replaceAll'; data: AppData }

const mapDebt = (s: AppData, id: string | undefined, f: (d: Debt) => Debt) =>
  s.debts.map((d) => (d.id === id ? f(d) : d))

function reducer(s: AppData, a: Action): AppData {
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
        // платёж по кредиту изменили — пересчитываем остаток
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

    case 'addDebt': return { ...s, debts: [a.item, ...s.debts] }
    case 'updateDebt': return { ...s, debts: s.debts.map((d) => (d.id === a.item.id ? a.item : d)) }
    case 'deleteDebt': return { ...s, debts: s.debts.filter((d) => d.id !== a.id) }
    case 'payDebt': {
      const d = s.debts.find((x) => x.id === a.id)
      if (!d || d.remaining <= 0) return s
      const amount = Math.min(d.monthlyPayment, d.remaining)
      return {
        ...s,
        expenses: [{ id: a.expenseId, amount, category: d.category, date: a.date, note: d.name, debtId: d.id }, ...s.expenses],
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
      // один лимит на категорию (или один общий)
      const rest = s.limits.filter((l) => l.id !== a.item.id && l.category !== a.item.category)
      return { ...s, limits: [...rest, a.item] }
    }
    case 'deleteLimit': return { ...s, limits: s.limits.filter((l) => l.id !== a.id) }

    case 'setCurrency': return { ...s, settings: { ...s.settings, currency: a.currency } }
    case 'setPlan': return { ...s, settings: { ...s.settings, plan: a.plan } }
    case 'replaceAll': return a.data
  }
}

const Ctx = createContext<{ data: AppData; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load)
  setCurrency(data.settings.currency)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* квота/приватный режим */
    }
  }, [data])

  return <Ctx.Provider value={{ data, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore outside StoreProvider')
  return c
}
