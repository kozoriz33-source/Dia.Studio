import { dateLabel, fmtMoney } from '../lib/format'
import type { Operation } from '../lib/calc'
import { DeleteBtn } from './ui'

export default function OperationRow({
  op, onDelete,
}: { op: Operation; onDelete?: () => void }) {
  const income = op.kind === 'income'
  const title = income ? op.source : op.category
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${income ? 'bg-accent/15 text-accent' : 'bg-panel2 text-muted'}`}>
        {income ? '↑' : '↓'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-muted">{dateLabel(op.date)}{op.note ? ` · ${op.note}` : ''}</p>
      </div>
      <span className={`num whitespace-nowrap ${income ? 'text-accent' : 'text-white'}`}>
        {income ? '+' : '−'}{fmtMoney(op.amount)}
      </span>
      {onDelete && <DeleteBtn onClick={onDelete} />}
    </li>
  )
}
