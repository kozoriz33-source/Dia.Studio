export interface Income {
  id: string
  amount: number
  source: string
  date: string // YYYY-MM-DD
  note: string
}

export interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note: string
}

export interface DebtPayment {
  date: string
  amount: number
}

export interface Debt {
  id: string
  name: string
  total: number // исходная сумма долга
  remaining: number // остаток долга
  monthlyPayment: number
  nextPaymentDate: string
  payments: DebtPayment[]
}

/** category === null — общий лимит на месяц */
export interface Limit {
  id: string
  category: string | null
  amount: number
}

export interface AppData {
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
  limits: Limit[]
  categories: string[]
}

export type TabId = 'dashboard' | 'income' | 'expenses' | 'debts' | 'limits'
