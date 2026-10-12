import type { AppData, GroupId, PlanShares } from './types'
import { catInfo } from './categories'
import { daysBetween, todayISO } from './format'
import { getPeriod, inRange, payEvents, sum, type PayEvent } from './calc'

export const DEFAULT_PLAN: PlanShares = { life: 60, savings: 20, invest: 10, vacation: 10 }

export const BUCKETS: { key: keyof PlanShares; label: string; hint: string; icon: string; color: string; category?: string }[] = [
  { key: 'life', label: 'На жизнь', hint: 'продукты, кафе, транспорт, топливо, покупки', icon: '🛒', color: '#16A34A' },
  { key: 'savings', label: 'Отложить', hint: 'подушка безопасности на 3–6 месяцев', icon: '🐷', color: '#2F5BFF', category: 'Подушка безопасности' },
  { key: 'invest', label: 'Инвестиции', hint: 'долгосрочно: ETF, вклад, пенсионный счёт', icon: '📈', color: '#7C5CFF', category: 'Инвестиции' },
  { key: 'vacation', label: 'На отдых', hint: 'отпуск и поездки', icon: '🏖️', color: '#E39A06', category: 'На отпуск' },
]

/**
 * План на период «от зарплаты до зарплаты» (или месяц):
 * доход − обязательные платежи = свободно → делим по долям.
 */
export function periodPlan(data: AppData, offset = 0) {
  const p = getPeriod(data.settings.payday, offset)
  const today = todayISO()
  const events = payEvents(data, p.start, p.end).filter((e) => e.date >= p.start || e.overdue)
  const mandatory = sum(events)
  const mandatoryPaid = sum(events.filter((e) => e.paid))
  const unpaid = events.filter((e) => !e.paid)

  const byGroup = new Map<GroupId, PayEvent[]>()
  for (const e of events) {
    const g = catInfo(data.categories, e.category).group
    byGroup.set(g, [...(byGroup.get(g) ?? []), e])
  }

  const incomeActual = sum(inRange(data.incomes, p.start, p.end))
  const expected = data.settings.payday && data.settings.salary > 0 ? data.settings.salary : 0
  const incomeIsExpected = incomeActual === 0 && expected > 0
  const income = incomeActual || expected

  const free = income - mandatory
  const shares = data.settings.plan
  const totalShare = shares.life + shares.savings + shares.invest + shares.vacation

  const exps = inRange(data.expenses, p.start, p.end)
  const spentIn = (category?: string) =>
    category
      ? sum(exps.filter((e) => e.category === category))
      : sum(exps.filter((e) => !e.billId && !e.debtId && catInfo(data.categories, e.category).group !== 'savings'))

  const buckets = BUCKETS.map((b) => {
    const planned = Math.max(0, (free * shares[b.key]) / 100)
    const actual = spentIn(b.category)
    return { ...b, share: shares[b.key], planned, actual, left: planned - actual }
  })

  const isCurrent = offset === 0
  const daysLeft = isCurrent ? daysBetween(today, p.end) : daysBetween(p.start, p.end)
  const life = buckets[0]
  const perDay = life.left > 0 ? life.left / daysLeft : 0

  return {
    period: p, events, unpaid, byGroup, mandatory, mandatoryPaid, toPay: sum(unpaid),
    income, incomeActual, incomeIsExpected, free, buckets, totalShare, perDay, daysLeft,
    spent: sum(exps), expenses: exps,
  }
}
