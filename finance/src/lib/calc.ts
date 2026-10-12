import type { AppData, Category, Credit, Expense, Income, Payday, PlanShares } from './types'
import { addMonthsYM, daysBetween, dueDate, endOfMonth, monthOf, shiftDays, todayISO } from './format'
import { GROUPS, GROUP_ORDER, catInfo } from './categories'

export const sum = (items: { amount: number }[]) => items.reduce((s, i) => s + i.amount, 0)

export const inRange = <T extends { date: string }>(items: T[], from: string, to: string) =>
  items.filter((i) => i.date >= from && i.date <= to)

export const inMonth = <T extends { date: string }>(items: T[], ym: string) =>
  items.filter((i) => monthOf(i.date) === ym)

/* ---------- Обязательные списания ---------- */

export interface Charge {
  key: string
  kind: 'bill' | 'credit'
  id: string
  name: string
  category: string
  amount: number
  date: string
  fromDay?: number
}

/** График платежей по кредиту после даты asOf, пока долг не выплачен */
export function creditSchedule(c: Credit, until: string): Charge[] {
  const out: Charge[] = []
  let ym = monthOf(c.asOf)
  if (dueDate(ym, c.day) <= c.asOf) ym = addMonthsYM(ym, 1)
  let rem = c.remaining
  for (let i = 0; rem > 0.005 && i < 600; i++, ym = addMonthsYM(ym, 1)) {
    const date = dueDate(ym, c.day)
    if (date > until) break
    const amount = Math.min(c.monthly, rem)
    out.push({ key: `c-${c.id}-${ym}`, kind: 'credit', id: c.id, name: c.name, category: c.category, amount, date, fromDay: c.fromDay })
    rem -= amount
  }
  return out
}

/** Остаток кредита на сегодня (платежи списываются сами в свой день) */
export const creditLeft = (c: Credit, today = todayISO()) =>
  Math.max(0, c.remaining - sum(creditSchedule(c, today)))

export const creditNext = (c: Credit, today = todayISO()) =>
  creditSchedule(c, shiftDays(today, 400)).find((x) => x.date > today)

export const creditMonthsLeft = (c: Credit, today = todayISO()) => {
  const left = creditLeft(c, today)
  return c.monthly > 0 ? Math.ceil(left / c.monthly - 1e-9) : 0
}

/** Все обязательные списания (платежи + кредиты) в диапазоне дат */
export function charges(data: AppData, from: string, to: string): Charge[] {
  const out: Charge[] = []
  for (const b of data.bills) {
    for (let ym = monthOf(from); ym <= monthOf(to); ym = addMonthsYM(ym, 1)) {
      const date = dueDate(ym, b.day)
      if (date >= from && date <= to) out.push({ key: `b-${b.id}-${ym}`, kind: 'bill', id: b.id, name: b.name, category: b.category, amount: b.amount, date, fromDay: b.fromDay })
    }
  }
  for (const c of data.credits) out.push(...creditSchedule(c, to).filter((x) => x.date >= from))
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
}

/** Сколько обязательных платежей в обычный месяц */
export function monthlyMandatory(data: AppData, today = todayISO()) {
  const bills = sum(data.bills)
  const credits = data.credits.reduce((s, c) => s + (creditLeft(c, today) > 0 ? Math.min(c.monthly, creditLeft(c, today)) : 0), 0)
  return { bills, credits, total: bills + credits }
}

/* ---------- Зарплаты и план ---------- */

export interface PayDate { date: string; payday: Payday }

/** Даты поступления зарплат в диапазоне */
export function payDates(data: AppData, from: string, to: string): PayDate[] {
  const out: PayDate[] = []
  for (const p of data.settings.paydays) {
    for (let ym = monthOf(from); ym <= monthOf(to); ym = addMonthsYM(ym, 1)) {
      const date = dueDate(ym, p.day)
      if (date >= from && date <= to) out.push({ date, payday: p })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Последняя зарплата не позже day и следующие n зарплат */
export function salaryAround(data: AppData, day = todayISO(), ahead = 3) {
  const list = payDates(data, shiftDays(day, -70), shiftDays(day, 100))
  const last = [...list].reverse().find((x) => x.date <= day) ?? null
  const upcoming = list.filter((x) => x.date > day).slice(0, ahead)
  return { last, upcoming, next: upcoming[0] ?? null }
}

/**
 * С какой зарплаты платится списание: если у платежа выбран день зарплаты —
 * последняя такая зарплата не позже даты платежа; иначе последняя зарплата строго до платежа.
 */
export function fundingDate(data: AppData, ch: Charge): string | null {
  const days = ch.fromDay && data.settings.paydays.some((p) => p.day === ch.fromDay)
    ? [ch.fromDay]
    : data.settings.paydays.map((p) => p.day)
  if (!days.length) return null
  let best: string | null = null
  for (let k = 0; k <= 2; k++) {
    const ym = addMonthsYM(monthOf(ch.date), -k)
    for (const d of days) {
      const date = dueDate(ym, d)
      const ok = ch.fromDay ? date <= ch.date : date < ch.date
      if (ok && (!best || date > best)) best = date
    }
  }
  return best
}

export const DEFAULT_PLAN: PlanShares = { life: 60, savings: 20, invest: 10, vacation: 10 }

export const BUCKETS: { key: keyof PlanShares; label: string; hint: string; icon: string; color: string; category?: string }[] = [
  { key: 'life', label: 'На жизнь', hint: 'еда, кафе, транспорт, топливо, покупки', icon: '🛒', color: '#16A34A' },
  { key: 'savings', label: 'Отложить', hint: 'подушка безопасности', icon: '🐷', color: '#2F5BFF', category: 'Подушка безопасности' },
  { key: 'invest', label: 'Инвестиции', hint: 'на долгий срок', icon: '📈', color: '#7C5CFF', category: 'Инвестиции' },
  { key: 'vacation', label: 'На отдых', hint: 'отпуск и поездки', icon: '🏖️', color: '#E39A06', category: 'На отпуск' },
]

/**
 * План одной зарплаты, пришедшей pay.date: сколько из неё отложить на закреплённые за ней
 * обязательные платежи, сколько остаётся до следующей зарплаты и как это поделить.
 */
export function salaryPlan(data: AppData, pay: PayDate, today = todayISO()) {
  const start = pay.date
  const after = payDates(data, shiftDays(start, 1), shiftDays(start, 40))[0]
  const next = after?.date ?? shiftDays(start, 30)
  const end = shiftDays(next, -1)

  const list = charges(data, start, shiftDays(start, 75)).filter((c) => fundingDate(data, c) === start)
  const setAside = sum(list)

  const received = sum(inRange(data.incomes, start, end))
  const income = received > 0 ? received : pay.payday.amount
  const free = income - setAside

  const exps = inRange(data.expenses, start, end)
  const shares = data.settings.plan
  const totalShare = shares.life + shares.savings + shares.invest + shares.vacation
  const buckets = BUCKETS.map((b) => {
    const planned = Math.max(0, (free * shares[b.key]) / 100)
    const actual = b.category
      ? sum(exps.filter((e) => e.category === b.category))
      : sum(exps.filter((e) => catInfo(data.categories, e.category).group !== 'savings'))
    return { ...b, share: shares[b.key], planned, actual, left: planned - actual }
  })

  const days = daysBetween(start, end)
  const status: 'future' | 'current' | 'past' = start > today ? 'future' : end < today ? 'past' : 'current'
  const daysLeft = status === 'current' ? daysBetween(today, end) : status === 'future' ? days : 0
  const life = buckets[0]
  const perDay = status === 'current' ? Math.max(0, life.left) / daysLeft : life.planned / days

  return { pay, start, next, end, list, setAside, received, income, free, buckets, totalShare, days, daysLeft, perDay, status }
}

/* ---------- Итоги месяца ---------- */

export function monthStats(data: AppData, ym: string, today = todayISO()) {
  const from = `${ym}-01`
  const to = endOfMonth(ym)
  const list = charges(data, from, to)
  const incomes = inMonth(data.incomes, ym)
  const expenses = inMonth(data.expenses, ym)
  const mandatory = sum(list)
  const charged = sum(list.filter((c) => c.date <= today))
  const income = sum(incomes)
  const spent = sum(expenses)
  const isFuture = from > today
  return { ym, list, incomes, expenses, mandatory, charged, income, spent, total: mandatory + spent, net: income - mandatory - spent, isFuture }
}

/** Месяцы для истории: от первой записи до текущего, плюс следующий как прогноз */
export function monthList(data: AppData, today = todayISO()) {
  const cur = monthOf(today)
  const dates = [...data.incomes, ...data.expenses].map((x) => monthOf(x.date))
  let first = dates.reduce((a, b) => (b < a ? b : a), cur)
  if (first < addMonthsYM(cur, -24)) first = addMonthsYM(cur, -24)
  const out: string[] = []
  for (let ym = addMonthsYM(cur, 1); ym >= first; ym = addMonthsYM(ym, -1)) out.push(ym)
  return out
}

/* ---------- Прочее ---------- */

/** Текущая сумма на руках, если пользователь её указывал: + доходы − траты − списания после этого */
export function currentBalance(data: AppData, today = todayISO()): number | null {
  const b = data.settings.balance
  if (!b) return null
  const after = (x: { ts: number }) => x.ts > b.ts
  const setDay = new Date(b.ts)
  const setISO = `${setDay.getFullYear()}-${String(setDay.getMonth() + 1).padStart(2, '0')}-${String(setDay.getDate()).padStart(2, '0')}`
  const auto = setISO < today ? sum(charges(data, shiftDays(setISO, 1), today)) : 0
  return b.amount + sum(data.incomes.filter(after)) - sum(data.expenses.filter(after)) - auto
}

export function byCategory(expenses: Expense[]) {
  const map = new Map<string, number>()
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function byGroup(expenses: { category: string; amount: number }[], categories: Category[]) {
  const map = new Map<string, number>()
  for (const e of expenses) {
    const g = catInfo(categories, e.category).group
    map.set(g, (map.get(g) ?? 0) + e.amount)
  }
  return GROUP_ORDER.filter((g) => map.has(g))
    .map((g) => ({ id: g, name: GROUPS[g].label, color: GROUPS[g].color, value: map.get(g)! }))
    .sort((a, b) => b.value - a.value)
}

export function topCategories(data: AppData, n: number) {
  const counts = new Map<string, number>()
  for (const e of data.expenses.slice(0, 300)) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
  const fallback = ['Продукты', 'Кафе и рестораны', 'Топливо', 'Транспорт', 'Аптека и врачи', 'Развлечения', 'Одежда', 'Прочее']
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  for (const f of fallback) if (!names.includes(f)) names.push(f)
  return names.filter((c) => data.categories.some((x) => x.name === c)).slice(0, n)
}

export type Operation =
  | ({ kind: 'income' } & Income)
  | ({ kind: 'expense' } & Expense)

export const operationsOf = (incomes: Income[], expenses: Expense[]): Operation[] =>
  [
    ...incomes.map((i) => ({ kind: 'income' as const, ...i })),
    ...expenses.map((e) => ({ kind: 'expense' as const, ...e })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts)

export const allOperations = (data: AppData) => operationsOf(data.incomes, data.expenses)
