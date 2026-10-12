export const CURRENCIES = [
  { symbol: '€', label: 'Евро' },
  { symbol: '₴', label: 'Гривна' },
  { symbol: '$', label: 'Доллар' },
  { symbol: 'zł', label: 'Злотый' },
]

let currency = '€'
/** Вызывается хранилищем при каждом рендере, чтобы fmtMoney знал текущую валюту */
export const setCurrency = (c: string) => { currency = c }

const nfInt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const nfDec = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtMoney = (n: number) => {
  const r = Math.round(n * 100) / 100
  return `${(Number.isInteger(r) ? nfInt : nfDec).format(r)} ${currency}`
}

export const parseAmount = (s: string) => parseFloat(s.replace(/\s/g, '').replace(',', '.'))

const pad = (n: number) => String(n).padStart(2, '0')

const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = () => toISO(new Date())

export const shiftDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return toISO(new Date(y, m - 1, d + n))
}

/** 'YYYY-MM' из даты 'YYYY-MM-DD' */
export const monthOf = (iso: string) => iso.slice(0, 7)
export const currentMonth = () => todayISO().slice(0, 7)

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1).replace(' г.', '')
}

export const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** «Сегодня», «Вчера», «Завтра» или «12 октября» */
export const dayLabel = (iso: string) => {
  const t = todayISO()
  if (iso === t) return 'Сегодня'
  if (iso === shiftDays(t, -1)) return 'Вчера'
  if (iso === shiftDays(t, 1)) return 'Завтра'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', ...(y !== new Date().getFullYear() && { year: 'numeric' }),
  })
}

export const daysInMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const endOfMonth = (ym: string) => `${ym}-${pad(daysInMonth(ym))}`

/** Дата платежа в месяце ym для дня day (обрезается до конца месяца) */
export const dueDate = (ym: string, day: number) => `${ym}-${pad(Math.min(day, daysInMonth(ym)))}`

/** Сдвиг даты на N месяцев с сохранением дня (обрезается до конца месяца) */
export const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(y, m - 1 + n + 1, 0).getDate()
  return toISO(new Date(y, m - 1 + n, Math.min(d, last)))
}

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)
