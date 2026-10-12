import type { ReactNode } from 'react'

const Svg = ({ children, size = 24, stroke = 2 }: { children: ReactNode; size?: number; stroke?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)

export const IconHome = () => <Svg><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" /></Svg>
export const IconHistory = () => <Svg><path d="M4 6h16M4 12h16M4 18h10" /></Svg>
export const IconCalendar = () => <Svg><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>
export const IconTarget = () => <Svg><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" fill="currentColor" /></Svg>
export const IconPlus = ({ size = 28 }: { size?: number }) => <Svg size={size} stroke={2.4}><path d="M12 5v14M5 12h14" /></Svg>
export const IconGear = () => (
  <Svg size={22}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></Svg>
)
export const IconBack = () => <Svg size={22}><path d="M15 5l-7 7 7 7" /></Svg>
export const IconBackspace = () => <Svg size={26}><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" /><path d="M12.5 9.5l5 5M17.5 9.5l-5 5" /></Svg>
export const IconCloud = () => <Svg size={14} stroke={2.2}><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.6 4.2 4.2 0 0 0 7 18z" /></Svg>
export const IconBell = () => <Svg size={18}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></Svg>
export const IconCheck = () => <Svg size={16} stroke={2.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
