import type { Category, GroupId } from './types'

export const GROUPS: Record<GroupId, { label: string; color: string }> = {
  credit: { label: 'Кредиты', color: '#a78bfa' },
  subs: { label: 'Подписки', color: '#f472b6' },
  telecom: { label: 'Связь и интернет', color: '#60a5fa' },
  home: { label: 'Квартира', color: '#02d2e3' },
  car: { label: 'Авто', color: '#facc15' },
  daily: { label: 'Повседневное', color: '#4ade80' },
  savings: { label: 'Накопления', color: '#34d399' },
  other: { label: 'Другое', color: '#94a3b8' },
}

export const GROUP_ORDER: GroupId[] = ['credit', 'subs', 'telecom', 'home', 'car', 'daily', 'savings', 'other']

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Кредит за телефон', group: 'credit', icon: '📱' },
  { name: 'Кредит за машину', group: 'credit', icon: '🚗' },
  { name: 'Кредитка', group: 'credit', icon: '💳' },
  { name: 'Кредит', group: 'credit', icon: '🏦' },
  { name: 'Xbox', group: 'subs', icon: '🎮' },
  { name: 'Netflix', group: 'subs', icon: '🎬' },
  { name: 'YouTube', group: 'subs', icon: '▶️' },
  { name: 'Мобильный (Vodafone)', group: 'telecom', icon: '📶' },
  { name: 'Интернет квартиры', group: 'telecom', icon: '🌐' },
  { name: 'Платёж за квартиру', group: 'home', icon: '🏠' },
  { name: 'Коммунальные', group: 'home', icon: '💡' },
  { name: 'Страховка машины', group: 'car', icon: '🛡️' },
  { name: 'Топливо', group: 'car', icon: '⛽' },
  { name: 'Обслуживание авто', group: 'car', icon: '🔧' },
  { name: 'Продукты', group: 'daily', icon: '🛒' },
  { name: 'Кафе и рестораны', group: 'daily', icon: '🍔' },
  { name: 'Транспорт', group: 'daily', icon: '🚌' },
  { name: 'Здоровье', group: 'daily', icon: '💊' },
  { name: 'Одежда', group: 'daily', icon: '👕' },
  { name: 'Развлечения', group: 'daily', icon: '🎉' },
  { name: 'Подушка безопасности', group: 'savings', icon: '🐷' },
  { name: 'Инвестиции', group: 'savings', icon: '📈' },
  { name: 'На отпуск', group: 'savings', icon: '🏖️' },
  { name: 'Прочее', group: 'other', icon: '📦' },
]

/** Категории из первой версии приложения, которых больше нет в списке по умолчанию */
export const LEGACY_CATEGORIES: Record<string, Category> = {
  'Жильё': { name: 'Жильё', group: 'home', icon: '🏠' },
  'Связь': { name: 'Связь', group: 'telecom', icon: '📶' },
}

export const ICON_CHOICES = [
  '📦', '🛒', '🍔', '☕', '🚌', '🚕', '⛽', '🚗', '🔧', '🛡️', '🏠', '💡', '💧', '🔥', '📶', '🌐', '📱', '💻',
  '🎮', '🎬', '▶️', '🎵', '📚', '💊', '🏋️', '👕', '🎁', '✈️', '🐶', '👶', '💳', '🏦', '💰', '🎉',
]

export const catInfo = (categories: Category[], name: string): Category =>
  categories.find((c) => c.name === name) ?? { name, group: 'other', icon: '📦' }

export const groupColor = (categories: Category[], name: string) =>
  GROUPS[catInfo(categories, name).group].color
