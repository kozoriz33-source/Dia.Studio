import { useState } from 'react'
import { Bar, Card, CatIcon, Empty, Head, Screen, Segmented, TextBtn } from '../components/ui'
import { useUI } from '../components/overlays'
import { byCategory, getPeriod, sum } from '../lib/calc'
import { GROUPS, MANDATORY_GROUPS, catInfo } from '../lib/categories'
import { periodPlan } from '../lib/plan'
import { dateLabel, fmtMoney } from '../lib/format'
import { useStore } from '../lib/store'
import type { PlanShares } from '../lib/types'

export default function Plan() {
  const { data, dispatch } = useStore()
  const { open } = useUI()
  const [offset, setOffset] = useState<'0' | '1'>('0')
  const plan = periodPlan(data, Number(offset))
  const shares = data.settings.plan
  const [showMandatory, setShowMandatory] = useState(false)
  const nextP = getPeriod(data.settings.payday, 1)
  const curP = getPeriod(data.settings.payday, 0)

  const step = (key: keyof PlanShares, d: number) =>
    dispatch({ type: 'setPlan', plan: { ...shares, [key]: Math.max(0, Math.min(100, shares[key] + d)) } })

  const cats = byCategory(plan.expenses.filter((e) => !e.billId && !e.debtId)).slice(0, 6)
  const catsTotal = sum(cats.map((c) => ({ amount: c.value })))

  return (
    <Screen title="План">
      <div className="animate-rise space-y-2">
        <Segmented value={offset} onChange={setOffset}
          options={[{ value: '0', label: curP.byPayday ? 'До зарплаты' : 'Этот месяц' }, { value: '1', label: curP.byPayday ? `С ${dateLabel(nextP.start)}` : 'Следующий' }]} />
        <p className="px-1 text-center text-[13px] font-medium text-ink2">Период: {plan.period.label}</p>
        {!data.settings.payday && (
          <button type="button" onClick={() => open({ kind: 'salary' })} className="w-full rounded-2xl bg-accentSoft p-3 text-left text-[13px] font-semibold text-accent">
            💡 Укажите день зарплаты, и план будет считаться от зарплаты до зарплаты
          </button>
        )}
      </div>

      {plan.income === 0 ? (
        <Card>
          <Empty icon="🧭" title="Нет дохода в этом периоде">Укажите зарплату или запишите доход, и я распишу, сколько куда направить</Empty>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn" onClick={() => open({ kind: 'salary' })}>Зарплата</button>
            <button type="button" className="btn-soft" onClick={() => open({ kind: 'quick', mode: 'income' })}>Записать доход</button>
          </div>
        </Card>
      ) : (
        <>
          {/* Доход → обязательные → свободно */}
          <Card>
            <Row icon="💰" label={plan.incomeIsExpected ? 'Зарплата (ожидается)' : 'Доход'} value={`+${fmtMoney(plan.income)}`} tone="ok" />
            <button type="button" className="w-full text-left" onClick={() => setShowMandatory(!showMandatory)}>
              <Row icon="📌" label="Обязательные платежи" sub={`${plan.events.length} шт. · ${showMandatory ? 'скрыть' : 'показать список'}`} value={`−${fmtMoney(plan.mandatory)}`} />
            </button>
            {showMandatory && (
              <div className="mb-2 ml-9 animate-fade space-y-2 rounded-2xl bg-soft p-3">
                {plan.events.length === 0 && <p className="text-[13px] text-ink2">Нет обязательных платежей в этом периоде</p>}
                {MANDATORY_GROUPS.filter((g) => plan.byGroup.has(g)).map((g) => (
                  <div key={g}>
                    <div className="flex justify-between text-[13px] font-bold" style={{ color: GROUPS[g].color }}>
                      <span>{GROUPS[g].label}</span><span>{fmtMoney(sum(plan.byGroup.get(g)!))}</span>
                    </div>
                    {plan.byGroup.get(g)!.map((e) => (
                      <div key={e.key} className="flex justify-between text-[13px] text-ink2">
                        <span>{e.paid ? '✓ ' : ''}{e.name}</span><span>{fmtMoney(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1 border-t border-dashed border-line pt-3">
              <div className="flex items-end justify-between gap-2">
                <p className="font-bold">Свободно</p>
                <p className={`num text-[30px] leading-none ${plan.free < 0 ? 'text-warn' : 'text-accent'}`}>{fmtMoney(plan.free)}</p>
              </div>
            </div>
            {plan.free < 0 && (
              <p className="mt-3 rounded-2xl bg-warnSoft p-3 text-[13px] text-warn">
                Обязательные платежи больше дохода на {fmtMoney(-plan.free)}. Посмотрите, от каких подписок можно отказаться.
              </p>
            )}
          </Card>

          {plan.free > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[17px] font-bold">Куда направить {fmtMoney(plan.free)}</h2>
                <span className={`text-[12px] font-bold ${plan.totalShare === 100 ? 'text-ink3' : 'text-warn'}`}>{plan.totalShare}%</span>
              </div>
              {plan.totalShare !== 100 && (
                <p className="-mt-1 px-1 text-[13px] text-warn">
                  {plan.totalShare < 100 ? `Ещё не распределено ${100 - plan.totalShare}%` : `Распределено больше 100% на ${plan.totalShare - 100}%`}
                </p>
              )}
              {plan.buckets.map((b, i) => {
                const over = b.left < 0
                return (
                  <Card key={b.key} delay={i * 40}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-xl" style={{ background: `${b.color}1A` }}>{b.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{b.label}</p>
                        <p className="truncate text-[12px] text-ink2">{b.hint}</p>
                      </div>
                      <div className="flex items-center rounded-2xl bg-soft p-1">
                        <button type="button" aria-label="Меньше" onClick={() => step(b.key, -5)} className="h-8 w-8 rounded-xl text-lg font-bold text-ink2 active:bg-white">−</button>
                        <span className="w-10 text-center text-sm font-bold">{b.share}%</span>
                        <button type="button" aria-label="Больше" onClick={() => step(b.key, 5)} className="h-8 w-8 rounded-xl text-lg font-bold text-ink2 active:bg-white">+</button>
                      </div>
                    </div>
                    <div className="mb-2 mt-3 flex items-baseline justify-between">
                      <span className="num text-[24px]" style={{ color: b.color }}>{fmtMoney(b.planned)}</span>
                      <span className={`text-[13px] ${over && b.key === 'life' ? 'font-semibold text-warn' : 'text-ink2'}`}>
                        {b.key === 'life' ? 'потрачено' : 'отложено'} {fmtMoney(b.actual)}
                      </span>
                    </div>
                    <Bar value={b.actual} max={b.planned} color={b.color} warn={b.key === 'life' && over} />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className={`text-[13px] ${over && b.key === 'life' ? 'font-semibold text-warn' : 'text-ink2'}`}>
                        {b.key === 'life'
                          ? over ? `Перерасход ${fmtMoney(-b.left)}` : offset === '0' ? `Осталось ${fmtMoney(b.left)} · ≈ ${fmtMoney(plan.perDay)}/день` : `≈ ${fmtMoney(plan.perDay)} в день`
                          : b.left > 0 ? `Отложить ещё ${fmtMoney(b.left)}` : '✓ Готово'}
                      </p>
                      {b.category && b.left > 0 && offset === '0' && (
                        <button type="button" className="rounded-full bg-ink px-3 py-1 text-[12px] font-bold text-white active:scale-95"
                          onClick={() => open({ kind: 'quick', category: b.category })}>
                          Отложить
                        </button>
                      )}
                    </div>
                  </Card>
                )
              })}
              <p className="px-2 text-[13px] leading-relaxed text-ink2">
                💡 Откладывайте сразу в день зарплаты, а не в конце. Сначала подушка безопасности на 3–6 месяцев расходов, потом инвестиции.
                Проценты меняются кнопками − и +.
              </p>
            </section>
          )}
        </>
      )}

      {cats.length > 0 && (
        <Card>
          <Head>На что уходят деньги</Head>
          <ul className="space-y-3">
            {cats.map((c) => {
              const info = catInfo(data.categories, c.name)
              return (
                <li key={c.name} className="flex items-center gap-3">
                  <CatIcon cat={info} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{c.name}</span>
                      <span className="num whitespace-nowrap">{fmtMoney(c.value)}</span>
                    </div>
                    <Bar value={c.value} max={catsTotal} color={GROUPS[info.group].color} height={6} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Limits expenses={plan.expenses} />
    </Screen>
  )
}

const Row = ({ icon, label, sub, value, tone }: { icon: string; label: string; sub?: string; value: string; tone?: 'ok' }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="w-6 text-center text-lg">{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="font-semibold">{label}</p>
      {sub && <p className="text-[12px] text-ink2">{sub}</p>}
    </div>
    <span className={`num whitespace-nowrap text-[17px] ${tone === 'ok' ? 'text-ok' : ''}`}>{value}</span>
  </div>
)

function Limits({ expenses }: { expenses: ReturnType<typeof periodPlan>['expenses'] }) {
  const { data } = useStore()
  const { open } = useUI()
  const limits = [...data.limits].sort((a, b) => (a.category === null ? -1 : b.category === null ? 1 : 0))
  return (
    <Card>
      <Head right={<TextBtn onClick={() => open({ kind: 'limit' })}>+ Лимит</TextBtn>}>Лимиты</Head>
      {limits.length === 0 ? (
        <p className="text-sm text-ink2">Например: не больше 200 € на кафе за период. Когда подойдёте к лимиту, полоска станет оранжевой.</p>
      ) : (
        <ul className="space-y-4">
          {limits.map((l) => {
            const spent = sum(l.category === null ? expenses : expenses.filter((e) => e.category === l.category))
            const ratio = spent / l.amount
            const warn = ratio >= 0.8
            const cat = l.category ? catInfo(data.categories, l.category) : { name: 'Все расходы', group: 'other' as const, icon: '💼' }
            return (
              <li key={l.id}>
                <button type="button" className="w-full text-left" onClick={() => open({ kind: 'limit', item: l })}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="flex-1 font-semibold">{l.category ?? 'Все расходы'}</span>
                    <span className="text-[13px] text-ink2"><b className={`num ${warn ? 'text-warn' : 'text-ink'}`}>{fmtMoney(spent)}</b> / {fmtMoney(l.amount)}</span>
                  </div>
                  <Bar value={spent} max={l.amount} warn={warn} color="#2F5BFF" />
                  <p className={`mt-1 text-[12px] ${warn ? 'font-semibold text-warn' : 'text-ink3'}`}>
                    {ratio > 1 ? `Превышен на ${fmtMoney(spent - l.amount)}` : `Осталось ${fmtMoney(l.amount - spent)}`}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
