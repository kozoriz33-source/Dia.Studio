import type { ReactNode } from 'react'

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)

export const IconDashboard = () => (
  <Svg><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Svg>
)
export const IconIncome = () => (
  <Svg><path d="M12 20V6" /><path d="M6 12l6-6 6 6" /><path d="M5 20h14" /></Svg>
)
export const IconExpense = () => (
  <Svg><path d="M12 4v14" /><path d="M6 12l6 6 6-6" /><path d="M5 4h14" /></Svg>
)
export const IconDebt = () => (
  <Svg><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18" /><path d="M7 15h4" /></Svg>
)
export const IconLimit = () => (
  <Svg><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-6" /><circle cx="12" cy="18" r="1" /></Svg>
)
export const IconTrash = () => (
  <Svg><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></Svg>
)
