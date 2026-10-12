export type GroupId = 'credit' | 'subs' | 'telecom' | 'home' | 'car' | 'sport' | 'daily' | 'savings' | 'other'

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
  /** время создания, мс — для расчёта текущего остатка на счету */
  ts?: number
}

export interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note: string
  ts?: number
  /** расход создан платежом по кредиту */
  debtId?: string
  /** расход создан отметкой регулярного платежа */
  billId?: string
  /** за какой месяц оплачен регулярный платёж (YYYY-MM), если не совпадает с датой */
  billMonth?: string
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
  /** день зарплаты (1–31) или null — тогда период = календарный месяц */
  payday: number | null
  /** ожидаемая зарплата */
  salary: number
  /** «сейчас на счету»: сумма и момент, когда её указали */
  balance: { amount: number; ts: number } | null
}

export interface AppData {
  version: 3
  /** мс последнего изменения — чтобы понять, какая копия свежее */
  updatedAt: number
  incomes: Income[]
  expenses: Expense[]
  debts: Debt[]
  bills: Bill[]
  limits: Limit[]
  categories: Category[]
  settings: Settings
}

export type TabId = 'home' | 'history' | 'payments' | 'plan' | 'settings'
