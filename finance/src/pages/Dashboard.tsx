import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, Empty, ProgressBar, SectionTitle } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { byCategory, inMonth, latestOperations, monthSummary } from '../lib/calc'
import { currentMonth, fmtMoney, monthLabel } from '../lib/format'
import { colorFor } from '../lib/palette'
import { useStore } from '../lib/store'
import type { TabId } from '../lib/types'

export default function Dashboard({ go }: { go: (t: TabId) => void }) {
  const { data } = useStore()
  const ym = currentMonth()
  const s = monthSummary(data, ym)
  const cats = byCategory(inMonth(data.expenses, ym))
  const spent = s.expenses + s.debt
  const over = s.available < 0
  const ops = latestOperations(data, 8)

  return (
    <div className="space-y-4">
      <p className="animate-rise text-sm text-muted">{monthLabel(ym)}</p>

      <Card className="text-center">
        <p className="text-xs text-muted">Доступно для трат</p>
        <p className={`num mt-1 text-5xl ${over ? 'text-warn' : 'text-accent'}`}>{fmtMoney(s.available)}</p>
        <p className="mt-2 text-xs text-muted">
          доходы − расходы − платежи по долгам ({fmtMoney(s.debt)})
        </p>
      </Card>

      <Card delay={80}>
        <SectionTitle>Доходы vs расходы</SectionTitle>
        <div className="mb-2 flex justify-between">
          <div>
            <p className="text-xs text-muted">Доходы</p>
            <p className="num text-lg text-accent">{fmtMoney(s.income)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Расходы + долги</p>
            <p className={`num text-lg ${spent > s.income ? 'text-warn' : 'text-white'}`}>{fmtMoney(spent)}</p>
          </div>
        </div>
        <ProgressBar value={spent} max={s.income} warn={spent > s.income * 0.9} />
        <p className="mt-2 text-xs text-muted">
          {s.income > 0 ? `Потрачено ${Math.round((spent / s.income) * 100)}% от доходов` : 'Добавьте доходы за месяц'}
        </p>
      </Card>

      <Card delay={160}>
        <SectionTitle>Расходы по категориям</SectionTitle>
        {cats.length === 0 ? (
          <Empty>Пока нет расходов в этом месяце</Empty>
        ) : (
          <>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cats} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="90%"
                    paddingAngle={2} stroke="none">
                    {cats.map((c, i) => <Cell key={c.name} fill={colorFor(i)} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmtMoney(Number(v))}
                    contentStyle={{ background: '#2a2d36', border: 'none', borderRadius: 12, color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {cats.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(i) }} />
                  <span className="truncate text-muted">{c.name}</span>
                  <span className="num ml-auto text-xs">{fmtMoney(c.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card delay={240}>
        <SectionTitle right={
          <span className="flex gap-3 text-xs text-accent">
            <button type="button" onClick={() => go('income')}>Доходы →</button>
            <button type="button" onClick={() => go('expenses')}>Расходы →</button>
          </span>
        }>
          Последние операции
        </SectionTitle>
        {ops.length === 0 ? (
          <Empty>Операций пока нет — добавьте доход или расход</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {ops.map((o) => <OperationRow key={o.id} op={o} />)}
          </ul>
        )}
      </Card>
    </div>
  )
}
