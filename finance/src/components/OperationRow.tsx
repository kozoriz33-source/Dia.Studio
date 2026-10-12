import { fmtMoney } from '../lib/format'
import { catInfo } from '../lib/categories'
import type { Operation } from '../lib/calc'
import type { Category } from '../lib/types'
import { CatIcon } from './ui'

export default function OperationRow({ op, categories, onClick, sub }: { op: Operation; categories: Category[]; onClick?: () => void; sub?: string }) {
  const income = op.kind === 'income'
  const title = income ? op.source : op.category
  const tag = !income && (op.debtId ? 'кредит' : op.billId ? 'обязательный' : '')
  const line = [sub, op.note && op.note !== title ? op.note : '', tag].filter(Boolean).join(' · ')
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left transition active:opacity-60">
        {income
          ? <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-okSoft text-xl">💰</span>
          : <CatIcon cat={catInfo(categories, op.category)} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          {line && <p className="truncate text-[13px] text-ink2">{line}</p>}
        </div>
        <span className={`num whitespace-nowrap text-[16px] ${income ? 'text-ok' : ''}`}>
          {income ? '+' : '−'}{fmtMoney(op.amount)}
        </span>
      </button>
    </li>
  )
}
