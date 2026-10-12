import { useStore } from '../lib/store'
import { useUI } from './overlays'
import { fmtMoney, monthOf, todayISO, uid } from '../lib/format'
import type { PayEvent } from '../lib/calc'

/** Отметить обязательный платёж оплаченным (создаёт расход) или снять отметку */
export function usePay() {
  const { data, dispatch } = useStore()
  const { toast } = useUI()
  return (e: PayEvent) => {
    const before = data
    if (e.paid) {
      dispatch({ type: 'deleteExpense', id: e.paid.id })
      toast(`Отметка снята: ${e.name}`, before)
      return
    }
    const today = todayISO()
    if (e.kind === 'debt') {
      dispatch({ type: 'payDebt', id: e.id, expenseId: uid(), date: today, ts: Date.now() })
    } else if (e.kind === 'bill') {
      const ym = monthOf(e.date)
      dispatch({
        type: 'addExpense',
        item: { id: uid(), amount: e.amount, category: e.category, date: today, note: e.name, billId: e.id, ts: Date.now(), ...(ym !== monthOf(today) && { billMonth: ym }) },
      })
    } else return
    toast(`Оплачено: ${e.name} · ${fmtMoney(e.amount)}`, before)
  }
}
