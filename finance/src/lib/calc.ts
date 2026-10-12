import type { AppData, Bill, Category, Expense, Income } from './types'
import {
  addMonths, addMonthsYM, dateLabel, daysBetween, dueDate, endOfMonth, monthLabel, monthOf, shiftDays, todayISO,
} from './format'
import { GROUPS, GROUP_ORDER, catInfo } from './categories'

export const sum = (items: { amount: number }[]) => items.reduce((s, i) => s + i.amount, 0)

export const inMonth = <T extends { date: string }>(items: T[], ym: string) =>
  items.filter((i) => monthOf(i.date) === ym)

/* ---------- Период: от зарплаты до зарплаты ---------- */

export interface Period { start: string; end: string; next: string; label: string; byPayday: boolean }

/** offset 0 — текущий период, 1 — следующий, -1 — прошлый */
export function getPeriod(payday: number | null, offset = 0, today = todayISO()): Period {
  const ym = monthOf(today)
  if (!payday) {
    const m = addMonthsYM(ym, offset)
    return { start: `${m}-01`, end: endOfMonth(m), next: `${addMonthsYM(m, 1)}-01`, label: monthLabel(m), byPayday: false }
  }
  let baseYM = ym
  if (dueDate(ym, payday) > today) baseYM = addMonthsYM(ym, -1)
  const startYM = addMonthsYM(baseYM, offset)
  const start = dueDate(startYM, payday)
  const next = dueDate(addMonthsYM(startYM, 1), payday)
  const end = shiftDays(next, -1)
  return { start, end, next, label: `${dateLabel(start)} – ${dateLabel(end)}`, byPayday: true }
}

export const inRange = <T extends { date: string }>(items: T[], from: string, to: string) =>
  items.filter((i) => i.date >= from && i.date <= to)

/* ---------- Календарь платежей ---------- */

export interface PayEvent {
  key: string
  kind: 'bill' | 'debt' | 'salary'
  id: string
  name: string
  category: string
  amount: number
  date: string
  /** расход, которым платёж уже оплачен */
  paid?: Expense
  overdue: boolean
}

export const billExpense = (data: AppData, b: Bill, ym: string) =>
  data.expenses.find((e) => e.billId === b.id && (e.billMonth ?? monthOf(e.date)) === ym)

/**
 * Все обязательные платежи (и зарплата) в диапазоне дат.
 * Неоплаченные просроченные попадают в список, даже если их дата раньше from.
 */
export function payEvents(data: AppData, from: string, to: string, withSalary = false): PayEvent[] {
  const today = todayISO()
  const out: PayEvent[] = []

  for (const b of data.bills) {
    for (let ym = monthOf(from); ym <= monthOf(to); ym = addMonthsYM(ym, 1)) {
      const date = dueDate(ym, b.day)
      const paid = billExpense(data, b, ym)
      const inside = date >= from && date <= to
      const overdue = !paid && date < today
      // просроченный неоплаченный этого месяца показываем, даже если он раньше диапазона
      if (!inside && !(overdue && ym === monthOf(today) && from <= today)) continue
      out.push({ key: `b-${b.id}-${ym}`, kind: 'bill', id: b.id, name: b.name, category: b.category, amount: paid?.amount ?? b.amount, date, paid, overdue })
    }
  }

  for (const d of data.debts) {
    // уже внесённые платежи
    for (const p of d.payments) {
      if (p.date < from || p.date > to) continue
      const paid = data.expenses.find((e) => e.id === p.expenseId)
      out.push({ key: `dp-${d.id}-${p.expenseId ?? p.date}`, kind: 'debt', id: d.id, name: d.name, category: d.category, amount: p.amount, date: p.date, paid, overdue: false })
    }
    // будущие (и просроченные) платежи
    let date = d.nextPaymentDate
    let rem = d.remaining
    let i = 0
    while (rem > 0 && date <= to && i < 60) {
      const overdue = date < today
      if (date >= from || (overdue && from <= today)) {
        out.push({ key: `d-${d.id}-${date}`, kind: 'debt', id: d.id, name: d.name, category: d.category, amount: Math.min(d.monthlyPayment, rem), date, overdue })
      }
      rem -= d.monthlyPayment
      date = addMonths(date, 1)
      i++
    }
  }

  const { payday, salary } = data.settings
  if (withSalary && payday && salary > 0) {
    for (let ym = monthOf(from); ym <= monthOf(to); ym = addMonthsYM(ym, 1)) {
      const date = dueDate(ym, payday)
      if (date < from || date > to || date < today) continue
      if (data.incomes.some((x) => x.date === date)) continue
      out.push({ key: `s-${ym}`, kind: 'salary', id: ym, name: 'Зарплата', category: '', amount: salary, date, overdue: false })
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'salary' ? -1 : 0))
}

/** Текущий остаток на счету, если пользователь его указывал */
export function currentBalance(data: AppData): number | null {
  const b = data.settings.balance
  if (!b) return null
  const after = (x: { ts?: number }) => (x.ts ?? 0) > b.ts
  return b.amount + sum(data.incomes.filter(after)) - sum(data.expenses.filter(after))
}

/* ---------- Группировки ---------- */

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

/** Категории, отсортированные по частоте использования (для быстрого ввода) */
export function topCategories(data: AppData, n: number) {
  const counts = new Map<string, number>()
  for (const e of data.expenses.slice(0, 300)) {
    if (e.billId || e.debtId) continue
    counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
  }
  const fallback = ['Продукты', 'Кафе и рестораны', 'Топливо', 'Транспорт', 'Аптека и врачи', 'Развлечения', 'Одежда', 'Прочее']
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  for (const f of fallback) if (!names.includes(f)) names.push(f)
  return names.filter((c) => data.categories.some((x) => x.name === c)).slice(0, n)
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
  ].sort((a, b) => b.date.localeCompare(a.date) || (b.ts ?? 0) - (a.ts ?? 0))

export { daysBetween }
