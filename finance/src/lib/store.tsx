import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { AppData, Debt, Expense, Income, Limit } from './types'
import { addMonths, todayISO } from './format'

const KEY = 'finance-app:v1'

export const DEFAULT_CATEGORIES = [
  'Продукты', 'Транспорт', 'Жильё', 'Здоровье', 'Развлечения', 'Одежда', 'Связь', 'Прочее',
]

const empty: AppData = {
  incomes: [], expenses: [], debts: [], limits: [], categories: DEFAULT_CATEGORIES,
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...empty, ...JSON.parse(raw) }
  } catch {
    /* повреждённые данные или недоступное хранилище — начинаем с нуля */
  }
  return empty
}

type Action =
  | { type: 'addIncome'; item: Income }
  | { type: 'addExpense'; item: Expense }
  | { type: 'deleteIncome'; id: string }
  | { type: 'deleteExpense'; id: string }
  | { type: 'addCategory'; name: string }
  | { type: 'addDebt'; item: Debt }
  | { type: 'deleteDebt'; id: string }
  | { type: 'payDebt'; id: string }
  | { type: 'setLimit'; item: Limit }
  | { type: 'deleteLimit'; id: string }

function reducer(s: AppData, a: Action): AppData {
  switch (a.type) {
    case 'addIncome': return { ...s, incomes: [a.item, ...s.incomes] }
    case 'addExpense': return { ...s, expenses: [a.item, ...s.expenses] }
    case 'deleteIncome': return { ...s, incomes: s.incomes.filter((i) => i.id !== a.id) }
    case 'deleteExpense': return { ...s, expenses: s.expenses.filter((i) => i.id !== a.id) }
    case 'addCategory':
      return s.categories.includes(a.name) ? s : { ...s, categories: [...s.categories, a.name] }
    case 'addDebt': return { ...s, debts: [a.item, ...s.debts] }
    case 'deleteDebt': return { ...s, debts: s.debts.filter((d) => d.id !== a.id) }
    case 'payDebt':
      return {
        ...s,
        debts: s.debts.map((d) => {
          if (d.id !== a.id || d.remaining <= 0) return d
          const amount = Math.min(d.monthlyPayment, d.remaining)
          return {
            ...d,
            remaining: d.remaining - amount,
            nextPaymentDate: addMonths(d.nextPaymentDate, 1),
            payments: [...d.payments, { date: todayISO(), amount }],
          }
        }),
      }
    case 'setLimit': {
      // один лимит на категорию (или один общий)
      const rest = s.limits.filter((l) => l.category !== a.item.category)
      return { ...s, limits: [...rest, a.item] }
    }
    case 'deleteLimit': return { ...s, limits: s.limits.filter((l) => l.id !== a.id) }
  }
}

const Ctx = createContext<{ data: AppData; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load)

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
