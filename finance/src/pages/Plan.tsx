import { Card, CatIcon, Empty, Page, ProgressBar, SectionTitle } from '../components/ui'
import { useOpenSheet } from '../components/sheets'
import { inMonth, sum } from '../lib/calc'
import { catInfo } from '../lib/categories'
import { monthPlan } from '../lib/plan'
import { currentMonth, fmtMoney, monthLabel } from '../lib/format'
import { useStore } from '../lib/store'
import type { PlanShares } from '../lib/types'

export default function Plan() {
  const { data, dispatch } = useStore()
  const open = useOpenSheet()
  const ym = currentMonth()
  const p = monthPlan(data, ym)
  const shares = data.settings.plan

  const step = (key: keyof PlanShares, d: number) => {
    const v = Math.max(0, Math.min(100, shares[key] + d))
    dispatch({ type: 'setPlan', plan: { ...shares, [key]: v } })
  }

  return (
    <Page title="План">
      <p className="-mt-2 animate-rise text-sm text-muted">{monthLabel(ym)} · сколько куда направить, чтобы остаться в плюсе</p>

      {p.income === 0 ? (
        <Card>
          <Empty icon="🧭">Добавьте доход за этот месяц, и план посчитается автоматически</Empty>
          <button type="button" className="btn w-full" onClick={() => open({ kind: 'operation', mode: 'income' })}>Добавить доход</button>
        </Card>
      ) : (
        <>
          {/* Доход → обязательные → свободно */}
          <Card className="space-y-3">
            <Row label="💰 Доход за месяц" value={fmtMoney(p.income)} tone="accent" />
            <Row label="📌 Обязательные платежи" sub={`подписки, связь, квартира ${fmtMoney(p.billsTotal)} · кредиты ${fmtMoney(p.debtsTotal)}`}
              value={`−${fmtMoney(p.mandatory)}`} />
            <div className="border-t border-dashed border-line pt-3">
              <Row label="Свободно для распределения" value={fmtMoney(p.free)} tone={p.free < 0 ? 'warn' : 'accent'} big />
            </div>
            {p.free < 0 && (
              <p className="rounded-xl bg-warn/15 p-3 text-sm text-warn">
                Обязательные платежи больше дохода на {fmtMoney(-p.free)}. Пересмотрите подписки или добавьте доход.
              </p>
            )}
          </Card>

          {/* Корзины */}
          {p.free > 0 && (
            <>
              <SectionTitle right={
                <span className={`text-xs font-semibold ${p.totalShare === 100 ? 'text-muted' : 'text-warn'}`}>
                  распределено {p.totalShare}%
                </span>
              }>Распределение</SectionTitle>
              {p.totalShare !== 100 && (
                <p className="-mt-2 text-xs text-warn">
                  {p.totalShare < 100 ? `Не распределено ${100 - p.totalShare}% (${fmtMoney((p.free * (100 - p.totalShare)) / 100)})` : `Сумма долей больше 100% на ${p.totalShare - 100}%`}
                </p>
              )}
              <ul className="space-y-3">
                {p.buckets.map((b, i) => {
                  const over = b.left < 0
                  return (
                    <Card key={b.key} delay={i * 50}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                          style={{ background: `${b.color}22`, boxShadow: `inset 0 0 0 1px ${b.color}44` }}>{b.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{b.label}</p>
                          <p className="truncate text-xs text-muted">{b.hint}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-xl bg-panel2 p-1">
                          <button type="button" aria-label="Меньше" onClick={() => step(b.key, -5)} className="h-7 w-7 rounded-lg text-lg text-muted active:bg-bg">−</button>
                          <span className="num w-10 text-center text-sm">{b.share}%</span>
                          <button type="button" aria-label="Больше" onClick={() => step(b.key, 5)} className="h-7 w-7 rounded-lg text-lg text-muted active:bg-bg">+</button>
                        </div>
                      </div>
                      <div className="mb-1.5 mt-3 flex items-baseline justify-between">
                        <span className="num text-2xl" style={{ color: b.color }}>{fmtMoney(b.planned)}</span>
                        <span className={`text-xs ${over ? 'text-warn' : 'text-muted'}`}>
                          {b.key === 'life' ? 'потрачено' : 'отложено'} {fmtMoney(b.actual)}
                        </span>
                      </div>
                      <ProgressBar value={b.actual} max={b.planned} color={b.color} warn={b.key === 'life' && over} />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className={`text-xs ${over && b.key === 'life' ? 'text-warn' : 'text-muted'}`}>
                          {b.key === 'life'
                            ? over ? `Перерасход ${fmtMoney(-b.left)}` : `Осталось ${fmtMoney(b.left)} · ≈ ${fmtMoney(p.perDay)} в день`
                            : b.left > 0 ? `Ещё отложить ${fmtMoney(b.left)}` : '✓ План выполнен'}
                        </p>
                        {b.category && b.left > 0 && (
                          <button type="button" className="rounded-lg bg-accent/15 px-3 py-1 text-xs font-semibold text-accent active:scale-95"
                            onClick={() => open({ kind: 'operation', mode: 'expense', preset: { category: b.category, amount: Math.round(b.left * 100) / 100 } })}>
                            Отложить
                          </button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </ul>
              <p className="text-xs leading-relaxed text-muted">
                Совет: откладывайте сразу после зарплаты, а не в конце месяца. Сначала подушка безопасности на 3–6 месяцев расходов,
                потом инвестиции. Проценты можно менять кнопками − и +.
              </p>
            </>
          )}
        </>
      )}

      <Limits />
    </Page>
  )
}

const Row = ({ label, sub, value, tone, big }: { label: string; sub?: string; value: string; tone?: 'accent' | 'warn'; big?: boolean }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className={big ? 'font-semibold' : 'text-sm'}>{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
    <span className={`num whitespace-nowrap ${big ? 'text-3xl' : 'text-lg'} ${tone === 'accent' ? 'text-accent' : tone === 'warn' ? 'text-warn' : ''}`}>{value}</span>
  </div>
)

function Limits() {
  const { data } = useStore()
  const open = useOpenSheet()
  const month = inMonth(data.expenses, currentMonth())
  const limits = [...data.limits].sort((a, b) => (a.category === null ? -1 : b.category === null ? 1 : 0))

  return (
    <section className="space-y-3 pt-2">
      <SectionTitle right={<button type="button" className="text-sm font-medium text-accent" onClick={() => open({ kind: 'limit' })}>+ Лимит</button>}>
        Лимиты на месяц
      </SectionTitle>
      {limits.length === 0 ? (
        <Card><Empty icon="🎯">Задайте лимит, например на кафе или на все расходы</Empty></Card>
      ) : (
        limits.map((l, i) => {
          const spent = sum(l.category === null ? month : month.filter((e) => e.category === l.category))
          const ratio = spent / l.amount
          const warn = ratio >= 0.8
          const cat = l.category ? catInfo(data.categories, l.category) : { name: 'Все расходы', group: 'other' as const, icon: '💼' }
          return (
            <Card key={l.id} delay={i * 40} onClick={() => open({ kind: 'limit', item: l })} className={ratio > 1 ? 'ring-1 ring-warn/60' : ''}>
              <div className="mb-2 flex items-center gap-3">
                <CatIcon cat={cat} size={36} />
                <span className="flex-1 font-semibold">{l.category ?? 'Общий лимит'}</span>
                <span className="text-sm text-muted"><span className={`num text-base ${warn ? 'text-warn' : 'text-white'}`}>{fmtMoney(spent)}</span> / {fmtMoney(l.amount)}</span>
              </div>
              <ProgressBar value={spent} max={l.amount} warn={warn} />
              <p className={`mt-1.5 text-xs ${warn ? 'text-warn' : 'text-muted'}`}>
                {ratio > 1 ? `Превышен на ${fmtMoney(spent - l.amount)}` : `Осталось ${fmtMoney(l.amount - spent)} · ${Math.round(ratio * 100)}%`}
              </p>
            </Card>
          )
        })
      )}
    </section>
  )
}
