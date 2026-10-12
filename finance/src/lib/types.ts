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
  ts: number // время создания, мс
}

export interface Expense {
  id: string
  amount: number
  category: string
  date: string
  note: string
  ts: number
}

/** Ежемесячный обязательный платёж — списывается сам в свой день */
export interface Bill {
  id: string
  name: string
  category: string
  amount: number
  day: number // 1–31
  /** с зарплаты какого числа платить; не задано — с последней зарплаты перед платежом */
  fromDay?: number
}

/** Кредит: платёж раз в месяц в свой день, пока не выплачен остаток */
export interface Credit {
  id: string
  name: string
  category: string
  monthly: number
  day: number
  /** остаток долга на дату asOf (после платежей до этой даты включительно) */
  remaining: number
  asOf: string
  fromDay?: number
}

/** Поступление зарплаты: день месяца и сумма */
export interface Payday {
  id: string
  name: string
  day: number
  amount: number
}

/** Как делить то, что остаётся с зарплаты после обязательных платежей, % */
export interface PlanShares {
  life: number
  savings: number
  invest: number
  vacation: number
}

export interface Settings {
  currency: string
  paydays: Payday[]
  plan: PlanShares
  /** «сейчас на руках»: сумма и момент, когда её указали */
  balance: { amount: number; ts: number } | null
}

export interface AppData {
  version: 4
  updatedAt: number
  incomes: Income[]
  expenses: Expense[]
  bills: Bill[]
  credits: Credit[]
  categories: Category[]
  settings: Settings
}

export type TabId = 'home' | 'months' | 'payments' | 'plan' | 'settings'
