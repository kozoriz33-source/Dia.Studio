import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card, CatIcon, Empty, LinkBtn, ProgressBar, SectionTitle } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { useOpenSheet } from '../components/sheets'
import { IconGear } from '../components/icons'
import { allOperations, byGroup, inMonth, monthSummary, upcoming } from '../lib/calc'
import { monthPlan } from '../lib/plan'
import { catInfo } from '../lib/categories'
import { currentMonth, dayLabel, fmtMoney, monthLabel, todayISO, uid } from '../lib/format'
import { useStore } from '../lib/store'
import type { TabId } from '../lib/types'

export default function Dashboard({ go }: { go: (t: TabId) => void }) {
  const { data, dispatch } = useStore()
  const open = useOpenSheet()
  const ym = currentMonth()
  const s = monthSummary(data, ym)
  const plan = monthPlan(data, ym)
  const groups = byGroup(inMonth(data.expenses, ym), data.categories)
  const totalSpent = groups.reduce((a, g) => a + g.value, 0)
  const due = upcoming(data)
  const ops = allOperations(data).slice(0, 6)
  const negative = s.available < 0

  const pay = (u: (typeof due)[number]) => {
    if (u.kind === 'debt') {
      dispatch({ type: 'payDebt', id: u.id, expenseId: uid(), date: todayISO() })
    } else {
      dispatch({ type: 'addExpense', item: { id: uid(), amount: u.amount, category: u.category, date: todayISO(), note: u.name, billId: u.id } })
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex animate-rise items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.14em] text-muted">{monthLabel(ym)}</p>
          <h1 className="num text-[28px] leading-tight">Мои финансы</h1>
        </div>
        <button type="button" onClick={() => go('settings')} aria-label="Настройки"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[.06] bg-panel text-muted active:scale-95">
          <IconGear />
        </button>
      </header>

      {/* Главная цифра */}
      <section className={`relative animate-rise overflow-hidden rounded-3xl p-5 text-bg ${negative ? 'bg-gradient-to-br from-[#ff8a33] to-[#ff5a00]' : 'bg-gradient-to-br from-[#28e6f5] via-[#02d2e3] to-[#0496b8] shadow-hero'}`}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
        <p className="relative text-sm font-semibold opacity-80">{negative ? 'Перерасход в этом месяце' : 'Можно потратить до конца месяца'}</p>
        <p className="num relative mt-1 text-[44px] leading-none">{fmtMoney(s.available)}</p>
        {!negative && plan.perDay > 0 && (
          <p className="relative mt-2 text-sm font-medium opacity-80">≈ {fmtMoney(plan.perDay)} в день по плану · {plan.daysLeft} дн.</p>
        )}
        <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/15 p-3 backdrop-blur">
          <Stat label="Доход" value={s.income} />
          <Stat label="Потрачено" value={s.spent} />
          <Stat label="К оплате" value={s.toPay} />
        </div>
      </section>

      {s.income === 0 && (
        <Card delay={40} className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <p className="flex-1 text-sm text-muted">Добавьте доход за месяц, чтобы видеть остаток и план.</p>
          <button type="button" className="btn !py-2 text-sm" onClick={() => open({ kind: 'operation', mode: 'income' })}>Доход</button>
        </Card>
      )}

      {/* Ближайшие платежи */}
      <Card delay={80}>
        <SectionTitle right={<LinkBtn onClick={() => go('bills')}>Все →</LinkBtn>}>Ближайшие платежи</SectionTitle>
        {due.length === 0 ? (
          <Empty icon="✅">{data.bills.length || data.debts.length ? 'Все платежи этого месяца оплачены' : 'Добавьте подписки, связь и кредиты во вкладках «Платежи» и «Кредиты»'}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {due.slice(0, 5).map((u) => (
              <li key={u.kind + u.id} className="flex items-center gap-3 py-2.5">
                <CatIcon cat={catInfo(data.categories, u.category)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className={`text-xs ${u.overdue ? 'text-warn' : 'text-muted'}`}>
                    {u.overdue ? 'Просрочено · ' : ''}{dayLabel(u.date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`num text-[17px] ${u.overdue ? 'text-warn' : ''}`}>{fmtMoney(u.amount)}</span>
                  <button type="button" onClick={() => pay(u)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold active:scale-95 ${u.overdue ? 'bg-warn text-white' : 'bg-accent/15 text-accent'}`}>
                    Оплатить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* План */}
      {s.income > 0 && (
        <Card delay={120} onClick={() => go('plan')}>
          <SectionTitle right={<span className="text-sm font-medium text-accent">План →</span>}>План месяца</SectionTitle>
          <div className="space-y-2.5">
            {plan.buckets.map((b) => (
              <div key={b.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{b.icon} {b.label}</span>
                  <span className="text-muted">
                    <span className={`num ${b.left < 0 ? 'text-warn' : 'text-white'}`}>{fmtMoney(b.actual)}</span> / {fmtMoney(b.planned)}
                  </span>
                </div>
                <ProgressBar value={b.actual} max={b.planned} color={b.color} warn={b.key === 'life' && b.left < 0} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Куда уходят деньги */}
      <Card delay={160}>
        <SectionTitle>Куда уходят деньги</SectionTitle>
        {groups.length === 0 ? (
          <Empty icon="📊">Пока нет расходов в этом месяце</Empty>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={groups} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="100%"
                    paddingAngle={3} cornerRadius={4} stroke="none" isAnimationActive>
                    {groups.map((g) => <Cell key={g.id} fill={g.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase tracking-wider text-muted">всего</span>
                <span className="num text-sm">{fmtMoney(totalSpent)}</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-sm">
              {groups.map((g) => (
                <li key={g.id} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className="text-xs text-muted">{Math.round((g.value / totalSpent) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Последние операции */}
      <Card delay={200}>
        <SectionTitle right={<LinkBtn onClick={() => go('operations')}>Все →</LinkBtn>}>Последние операции</SectionTitle>
        {ops.length === 0 ? (
          <Empty icon="🧾">Нажмите «+», чтобы добавить первую операцию</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {ops.map((o) => (
              <OperationRow key={o.id} op={o} categories={data.categories} showDate={dayLabel(o.date)}
                onClick={() => open({ kind: 'operation', mode: o.kind, item: o })} />
            ))}
          </ul>
        )}
      </Card>

    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
    <p className="num truncate text-[15px]">{fmtMoney(value)}</p>
  </div>
)
