export type GroupId = 'credit' | 'subs' | 'telecom' | 'home' | 'car' | 'daily' | 'savings' | 'other'

export interface Category {
  name: string
  group: GroupId
  icon: string
}

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
  /** расход создан платежом по кредиту */
  debtId?: string
  /** расход создан отметкой регулярного платежа */
  billId?: string
}

export interface DebtPayment {
  date: string
  amount: number
  expenseId?: string
}

export interface Debt {
  id: string
  name: string
  /** категория расхода, в которую попадают платежи */
  category: string
  total: number
  remaining: number
  monthlyPayment: number
  nextPaymentDate: string
  payments: DebtPayment[]
}

/** Регулярный ежемесячный платёж: подписка, связь, квартира, страховка… */
export interface Bill {
  id: string
  name: string
  category: string
  amount: number
  day: number // день месяца 1–31
}

/** category === null — общий лимит на месяц */
export interface Limit {
  id: string
  category: string | null
  amount: number
}

/** Как делить свободный остаток (доход минус обязательные платежи), в процентах */
export interface PlanShares {
  life: number
  savings: number
  invest: number
  vacation: number
}

export interface Settings {
  currency: string
  plan: PlanShares
}

export interface AppData {
  version: 2
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
  bills: Bill[]
  limits: Limit[]
  categories: Category[]
  settings: Settings
}

export type TabId = 'dashboard' | 'operations' | 'bills' | 'debts' | 'plan' | 'settings'
