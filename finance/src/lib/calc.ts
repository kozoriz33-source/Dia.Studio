import type { AppData, Bill, Category, Debt, Expense, Income } from './types'
import { currentMonth, dueDate, endOfMonth, monthOf, todayISO } from './format'
import { GROUPS, GROUP_ORDER, catInfo } from './categories'

export const inMonth = <T extends { date: string }>(items: T[], ym: string) =>
  items.filter((i) => monthOf(i.date) === ym)

export const sum = (items: { amount: number }[]) => items.reduce((s, i) => s + i.amount, 0)

export const isOverdue = (d: Debt) => d.remaining > 0 && d.nextPaymentDate < todayISO()

export const billExpense = (data: AppData, b: Bill, ym: string) =>
  data.expenses.find((e) => e.billId === b.id && monthOf(e.date) === ym)

/** Платёж по кредиту, который ещё предстоит внести до конца месяца ym */
export const debtDue = (d: Debt, ym: string) =>
  d.remaining > 0 && d.nextPaymentDate <= endOfMonth(ym) ? Math.min(d.monthlyPayment, d.remaining) : 0

export interface Upcoming {
  kind: 'bill' | 'debt'
  id: string
  name: string
  category: string
  amount: number
  date: string
  overdue: boolean
}

/** Неоплаченные регулярные платежи и кредиты текущего месяца (и просроченные) */
export function upcoming(data: AppData): Upcoming[] {
  const ym = currentMonth()
  const today = todayISO()
  const items: Upcoming[] = []
  for (const b of data.bills) {
    if (billExpense(data, b, ym)) continue
    const date = dueDate(ym, b.day)
    items.push({ kind: 'bill', id: b.id, name: b.name, category: b.category, amount: b.amount, date, overdue: date < today })
  }
  for (const d of data.debts) {
    const amount = debtDue(d, ym)
    if (!amount) continue
    items.push({ kind: 'debt', id: d.id, name: d.name, category: d.category, amount, date: d.nextPaymentDate, overdue: isOverdue(d) })
  }
  return items.sort((a, b) => a.date.localeCompare(b.date))
}

export function monthSummary(data: AppData, ym = currentMonth()) {
  const income = sum(inMonth(data.incomes, ym))
  const spent = sum(inMonth(data.expenses, ym))
  const toPay = ym === currentMonth() ? sum(upcoming(data)) : 0
  return { income, spent, toPay, available: income - spent - toPay }
}

export function byCategory(expenses: Expense[]) {
  const map = new Map<string, number>()
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function byGroup(expenses: Expense[], categories: Category[]) {
  const map = new Map<string, number>()
  for (const e of expenses) {
    const g = catInfo(categories, e.category).group
    map.set(g, (map.get(g) ?? 0) + e.amount)
  }
  return GROUP_ORDER.filter((g) => map.has(g))
    .map((g) => ({ id: g, name: GROUPS[g].label, color: GROUPS[g].color, value: map.get(g)! }))
    .sort((a, b) => b.value - a.value)
}

export const monthsOf = (items: { date: string }[], always: string) =>
  [...new Set([always, ...items.map((i) => monthOf(i.date))])].sort().reverse()

export type Operation =
  | ({ kind: 'income' } & Income)
  | ({ kind: 'expense' } & Expense)

export const allOperations = (data: AppData): Operation[] =>
  [
    ...data.incomes.map((i) => ({ kind: 'income' as const, ...i })),
    ...data.expenses.map((e) => ({ kind: 'expense' as const, ...e })),
  ].sort((a, b) => b.date.localeCompare(a.date))
