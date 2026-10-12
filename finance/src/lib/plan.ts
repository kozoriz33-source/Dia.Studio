import type { AppData, PlanShares } from './types'
import { catInfo } from './categories'
import { currentMonth, daysInMonth, todayISO } from './format'
import { debtDue, inMonth, sum } from './calc'

export const DEFAULT_PLAN: PlanShares = { life: 60, savings: 20, invest: 10, vacation: 10 }

export const BUCKETS: { key: keyof PlanShares; label: string; hint: string; icon: string; color: string; category?: string }[] = [
  { key: 'life', label: 'На жизнь', hint: 'продукты, кафе, транспорт, топливо, покупки', icon: '🛒', color: '#4ade80' },
  { key: 'savings', label: 'Отложить', hint: 'подушка безопасности на 3–6 месяцев', icon: '🐷', color: '#02d2e3', category: 'Подушка безопасности' },
  { key: 'invest', label: 'Инвестиции', hint: 'долгосрочно: ETF, вклады, пенсионный счёт', icon: '📈', color: '#a78bfa', category: 'Инвестиции' },
  { key: 'vacation', label: 'На отдых', hint: 'отпуск и поездки', icon: '🏖️', color: '#facc15', category: 'На отпуск' },
]

/**
 * План месяца: из дохода сначала вычитаются обязательные платежи
 * (регулярные платежи + кредиты), остаток делится по долям PlanShares.
 */
export function monthPlan(data: AppData, ym = currentMonth()) {
  const exps = inMonth(data.expenses, ym)
  const income = sum(inMonth(data.incomes, ym))

  const billsTotal = sum(data.bills)
  const debtsTotal = data.debts.reduce((s, d) => {
    const paid = sum(exps.filter((e) => e.debtId === d.id))
    return s + paid + debtDue(d, ym)
  }, 0)
  const mandatory = billsTotal + debtsTotal
  const mandatoryPaid = sum(exps.filter((e) => e.billId || e.debtId))

  const free = income - mandatory
  const shares = data.settings.plan
  const totalShare = shares.life + shares.savings + shares.invest + shares.vacation

  const spentIn = (category?: string) => {
    if (category) return sum(exps.filter((e) => e.category === category))
    // «на жизнь» — всё, что не обязательный платёж и не накопления
    return sum(exps.filter((e) => !e.billId && !e.debtId && catInfo(data.categories, e.category).group !== 'savings'))
  }

  const buckets = BUCKETS.map((b) => {
    const planned = Math.max(0, (free * shares[b.key]) / 100)
    const actual = spentIn(b.category)
    return { ...b, share: shares[b.key], planned, actual, left: planned - actual }
  })

  const isCurrent = ym === currentMonth()
  const daysLeft = isCurrent ? daysInMonth(ym) - Number(todayISO().slice(8)) + 1 : daysInMonth(ym)
  const life = buckets[0]
  const perDay = life.left > 0 ? life.left / daysLeft : 0

  return { income, mandatory, mandatoryPaid, billsTotal, debtsTotal, free, buckets, perDay, daysLeft, totalShare }
}
