import { fmtMoney } from '../lib/format'
import { catInfo } from '../lib/categories'
import type { Operation } from '../lib/calc'
import type { Category } from '../lib/types'
import { CatIcon } from './ui'

export default function OperationRow({
  op, categories, onClick, showDate,
}: { op: Operation; categories: Category[]; onClick?: () => void; showDate?: string }) {
  const income = op.kind === 'income'
  const cat: Category = income ? { name: op.source, group: 'daily', icon: '💰' } : catInfo(categories, op.category)
  const title = income ? op.source : op.category
  const sub = [showDate, op.note, !income && op.debtId && 'кредит', !income && op.billId && 'регулярный'].filter(Boolean).join(' · ')
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-60">
        {income
          ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-lg ring-1 ring-inset ring-accent/30">💰</span>
          : <CatIcon cat={cat} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          {sub && <p className="truncate text-xs text-muted">{sub}</p>}
        </div>
        <span className={`num whitespace-nowrap text-[17px] ${income ? 'text-accent' : 'text-white'}`}>
          {income ? '+' : '−'}{fmtMoney(op.amount)}
        </span>
      </button>
    </li>
  )
}
