import type { AppData, Debt, Expense, Income } from './types'
import { endOfMonth, monthOf, todayISO } from './format'

export const inMonth = <T extends { date: string }>(items: T[], ym: string) =>
  items.filter((i) => monthOf(i.date) === ym)

export const sum = (items: { amount: number }[]) => items.reduce((s, i) => s + i.amount, 0)

export const isOverdue = (d: Debt) => d.remaining > 0 && d.nextPaymentDate < todayISO()

/**
 * Платежи по долгам за месяц: фактически внесённые в этом месяце
 * + ещё не внесённые запланированные (дата следующего платежа <= конца месяца).
 */
export function debtPaymentsForMonth(debts: Debt[], ym: string) {
  let paid = 0
  let scheduled = 0
  for (const d of debts) {
    paid += sum(d.payments.filter((p) => monthOf(p.date) === ym))
    if (d.remaining > 0 && d.nextPaymentDate <= endOfMonth(ym)) {
      scheduled += Math.min(d.monthlyPayment, d.remaining)
    }
  }
  return { paid, scheduled, total: paid + scheduled }
}

export function monthSummary(data: AppData, ym: string) {
  const income = sum(inMonth(data.incomes, ym))
  const expenses = sum(inMonth(data.expenses, ym))
  const debt = debtPaymentsForMonth(data.debts, ym).total
  return { income, expenses, debt, available: income - expenses - debt }
}

export function byCategory(expenses: Expense[]) {
  const map = new Map<string, number>()
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export const monthsOf = (items: { date: string }[], always: string) =>
  [...new Set([always, ...items.map((i) => monthOf(i.date))])].sort().reverse()

export type Operation =
  | ({ kind: 'income' } & Income)
  | ({ kind: 'expense' } & Expense)

export function latestOperations(data: AppData, limit: number): Operation[] {
  const all: Operation[] = [
    ...data.incomes.map((i) => ({ kind: 'income' as const, ...i })),
    ...data.expenses.map((e) => ({ kind: 'expense' as const, ...e })),
  ]
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}
