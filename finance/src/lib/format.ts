export const CURRENCY = '₴'

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export const fmtMoney = (n: number) => `${nf.format(Math.round(n * 100) / 100)} ${CURRENCY}`

const pad = (n: number) => String(n).padStart(2, '0')

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM' из даты 'YYYY-MM-DD' */
export const monthOf = (iso: string) => iso.slice(0, 7)
export const currentMonth = () => todayISO().slice(0, 7)

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Последний день месяца 'YYYY-MM' в формате ISO */
export const endOfMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${pad(new Date(y, m, 0).getDate())}`
}

/** Сдвиг даты на N месяцев с сохранением дня (обрезается до конца месяца) */
export const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(y, m - 1 + n + 1, 0).getDate()
  const t = new Date(y, m - 1 + n, Math.min(d, last))
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)
