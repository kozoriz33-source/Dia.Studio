import type { Category, GroupId } from './types'

export const GROUPS: Record<GroupId, { label: string; color: string }> = {
  credit: { label: 'Кредиты', color: '#7C5CFF' },
  subs: { label: 'Подписки', color: '#E5488A' },
  telecom: { label: 'Связь и интернет', color: '#2F80ED' },
  home: { label: 'Квартира', color: '#0EA5A4' },
  car: { label: 'Авто', color: '#E39A06' },
  sport: { label: 'Спорт и здоровье', color: '#06AED4' },
  daily: { label: 'Повседневное', color: '#16A34A' },
  savings: { label: 'Накопления', color: '#4F46E5' },
  other: { label: 'Другое', color: '#64748B' },
}

export const GROUP_ORDER: GroupId[] = ['credit', 'subs', 'telecom', 'home', 'car', 'sport', 'daily', 'savings', 'other']

/** Группы обязательных ежемесячных платежей */
export const MANDATORY_GROUPS: GroupId[] = ['credit', 'subs', 'telecom', 'home', 'car', 'sport', 'other']

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Кредит за телефон', group: 'credit', icon: '📱' },
  { name: 'Кредит за машину', group: 'credit', icon: '🚗' },
  { name: 'Кредитка', group: 'credit', icon: '💳' },
  { name: 'Кредит', group: 'credit', icon: '🏦' },
  { name: 'Xbox', group: 'subs', icon: '🎮' },
  { name: 'Netflix', group: 'subs', icon: '🎬' },
  { name: 'YouTube', group: 'subs', icon: '▶️' },
  { name: 'Другая подписка', group: 'subs', icon: '🔁' },
  { name: 'Мобильный (Vodafone)', group: 'telecom', icon: '📶' },
  { name: 'Интернет квартиры', group: 'telecom', icon: '🌐' },
  { name: 'Платёж за квартиру', group: 'home', icon: '🏠' },
  { name: 'Коммунальные', group: 'home', icon: '💡' },
  { name: 'Страховка машины', group: 'car', icon: '🛡️' },
  { name: 'Топливо', group: 'car', icon: '⛽' },
  { name: 'Обслуживание авто', group: 'car', icon: '🔧' },
  { name: 'Фитнес', group: 'sport', icon: '🏋️' },
  { name: 'Аптека и врачи', group: 'sport', icon: '💊' },
  { name: 'Продукты', group: 'daily', icon: '🛒' },
  { name: 'Кафе и рестораны', group: 'daily', icon: '🍔' },
  { name: 'Транспорт', group: 'daily', icon: '🚌' },
  { name: 'Одежда', group: 'daily', icon: '👕' },
  { name: 'Развлечения', group: 'daily', icon: '🎉' },
  { name: 'Подарки', group: 'daily', icon: '🎁' },
  { name: 'Подушка безопасности', group: 'savings', icon: '🐷' },
  { name: 'Инвестиции', group: 'savings', icon: '📈' },
  { name: 'На отпуск', group: 'savings', icon: '🏖️' },
  { name: 'Прочее', group: 'other', icon: '📦' },
]

/** Категории старых версий, которых больше нет в списке по умолчанию */
export const LEGACY_CATEGORIES: Record<string, Category> = {
  'Жильё': { name: 'Жильё', group: 'home', icon: '🏠' },
  'Связь': { name: 'Связь', group: 'telecom', icon: '📶' },
  'Здоровье': { name: 'Здоровье', group: 'sport', icon: '💊' },
}

/** Готовые шаблоны обязательных платежей для быстрого добавления */
export const OBLIGATION_PRESETS: { name: string; category: string; kind: 'bill' | 'debt' }[] = [
  { name: 'Кредит за телефон', category: 'Кредит за телефон', kind: 'debt' },
  { name: 'Кредит за машину', category: 'Кредит за машину', kind: 'debt' },
  { name: 'Кредитка', category: 'Кредитка', kind: 'debt' },
  { name: 'Квартира', category: 'Платёж за квартиру', kind: 'bill' },
  { name: 'Коммунальные', category: 'Коммунальные', kind: 'bill' },
  { name: 'Vodafone', category: 'Мобильный (Vodafone)', kind: 'bill' },
  { name: 'Интернет квартиры', category: 'Интернет квартиры', kind: 'bill' },
  { name: 'Страховка машины', category: 'Страховка машины', kind: 'bill' },
  { name: 'Фитнес', category: 'Фитнес', kind: 'bill' },
  { name: 'Xbox Game Pass', category: 'Xbox', kind: 'bill' },
  { name: 'Netflix', category: 'Netflix', kind: 'bill' },
  { name: 'YouTube Premium', category: 'YouTube', kind: 'bill' },
]

export const ICON_CHOICES = [
  '📦', '🛒', '🍔', '☕', '🚌', '🚕', '⛽', '🚗', '🔧', '🛡️', '🏠', '💡', '💧', '🔥', '📶', '🌐', '📱', '💻',
  '🎮', '🎬', '▶️', '🎵', '📚', '💊', '🏋️', '👕', '🎁', '✈️', '🐶', '👶', '💳', '🏦', '💰', '🎉', '🚬', '💇',
]

export const catInfo = (categories: Category[], name: string): Category =>
  categories.find((c) => c.name === name) ?? { name, group: 'other', icon: '📦' }

export const groupColor = (categories: Category[], name: string) =>
  GROUPS[catInfo(categories, name).group].color
