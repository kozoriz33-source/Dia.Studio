import { Bar, Card, CatIcon, Empty, Head, Pill, Screen } from '../components/ui'
import { useUI } from '../components/overlays'
import { usePay } from '../components/usePay'
import { IconCheck, IconPlus } from '../components/icons'
import { currentBalance, payEvents, sum } from '../lib/calc'
import { periodPlan } from '../lib/plan'
import { GROUPS, MANDATORY_GROUPS, OBLIGATION_PRESETS, catInfo } from '../lib/categories'
import { dateLabel, dayLabel, fmtMoney, shiftDays, todayISO, weekdayShort } from '../lib/format'
import { useStore } from '../lib/store'
import type { Bill, Debt, GroupId } from '../lib/types'

export default function Payments() {
  const { data } = useStore()
  const { open } = useUI()
  const pay = usePay()
  const today = todayISO()
  const plan = periodPlan(data, 0)
  const balance = currentBalance(data)

  // календарь на 5 недель вперёд, с зарплатой
  const events = payEvents(data, today, shiftDays(today, 35), true).filter((e) => !e.paid)
  const days: { date: string; items: typeof events }[] = []
  for (const e of events) {
    const key = e.overdue ? 'overdue' : e.date
    const last = days[days.length - 1]
    if (last?.date === key) last.items.push(e)
    else days.push({ date: key, items: [e] })
  }
  let running = balance

  const monthlyTotal = sum(data.bills) + sum(data.debts.filter((d) => d.remaining > 0).map((d) => ({ amount: Math.min(d.monthlyPayment, d.remaining) })))
  const groups = new Map<GroupId, ({ type: 'bill'; item: Bill } | { type: 'debt'; item: Debt })[]>()
  for (const b of data.bills) {
    const g = catInfo(data.categories, b.category).group
    groups.set(g, [...(groups.get(g) ?? []), { type: 'bill', item: b }])
  }
  for (const d of data.debts) {
    groups.set('credit', [...(groups.get('credit') ?? []), { type: 'debt', item: d }])
  }
  const presets = OBLIGATION_PRESETS.filter((p) =>
    !data.bills.some((b) => b.category === p.category) && !data.debts.some((d) => d.category === p.category))

  return (
    <Screen title="Платежи" right={
      <button type="button" onClick={() => open({ kind: 'obligation' })} aria-label="Добавить платёж"
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white active:scale-95"><IconPlus size={22} /></button>
    }>
      {/* Сводка */}
      <Card>
        <p className="text-[13px] font-semibold text-ink2">
          {plan.period.byPayday ? `До зарплаты · ${dateLabel(plan.period.next)}` : `До конца месяца · ${plan.period.label}`}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="num text-[32px] leading-tight">{fmtMoney(plan.toPay)}</p>
            <p className="text-[13px] text-ink2">осталось оплатить · {plan.unpaid.length} шт.</p>
          </div>
          <Pill tone="ok"><IconCheck /> {fmtMoney(plan.mandatoryPaid)}</Pill>
        </div>
        <div className="mt-3"><Bar value={plan.mandatoryPaid} max={plan.mandatory} color="#12A150" /></div>
        {balance !== null && (
          <p className={`mt-3 rounded-2xl p-3 text-[13px] ${balance - plan.toPay < 0 ? 'bg-warnSoft text-warn' : 'bg-soft text-ink2'}`}>
            На счету {fmtMoney(balance)} → после всех платежей останется <b>{fmtMoney(balance - plan.toPay)}</b>
          </p>
        )}
      </Card>

      {/* Календарь */}
      {days.length > 0 && (
        <section className="animate-rise space-y-2" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[17px] font-bold">Календарь</h2>
            {balance !== null && <span className="text-[12px] font-semibold text-ink3">остаток после дня</span>}
          </div>
          <div className="card !p-0">
            {days.map((d) => {
              if (running !== null) running += sum(d.items.map((e) => ({ amount: e.kind === 'salary' ? e.amount : -e.amount })))
              const isOver = d.date === 'overdue'
              return (
                <div key={d.date} className="border-b border-line px-4 py-2 last:border-0">
                  <div className="flex items-center justify-between py-1">
                    <span className={`text-[13px] font-bold ${isOver ? 'text-warn' : ''}`}>
                      {isOver ? 'Просрочено' : <>{dayLabel(d.date)} <span className="font-medium text-ink3">· {weekdayShort(d.date)}</span></>}
                    </span>
                    {running !== null && <span className={`num text-[13px] ${running < 0 ? 'text-warn' : 'text-ink3'}`}>{fmtMoney(running)}</span>}
                  </div>
                  {d.items.map((e) => (
                    <div key={e.key} className="flex items-center gap-3 py-1.5">
                      {e.kind === 'salary'
                        ? <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-okSoft text-lg">💰</span>
                        : <CatIcon cat={catInfo(data.categories, e.category)} size={38} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{e.name}</p>
                        {isOver && <p className="text-[12px] text-warn">{dateLabel(e.date)}</p>}
                      </div>
                      <span className={`num text-[15px] ${e.kind === 'salary' ? 'text-ok' : ''}`}>{e.kind === 'salary' ? '+' : '−'}{fmtMoney(e.amount)}</span>
                      {e.kind !== 'salary' && e.date <= plan.period.end && (
                        <button type="button" onClick={() => pay(e)} aria-label={`Оплатить ${e.name}`}
                          className={`rounded-full px-2.5 py-1 text-[12px] font-bold active:scale-95 ${e.overdue ? 'bg-warn text-white' : 'bg-soft text-ink'}`}>
                          Оплатить
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Список обязательных */}
      <section className="space-y-3 pt-1">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[17px] font-bold">Мои обязательные</h2>
          {monthlyTotal > 0 && <span className="text-[13px] text-ink2">в месяц <b className="num text-ink">{fmtMoney(monthlyTotal)}</b></span>}
        </div>

        {groups.size === 0 && (
          <Card><Empty icon="🗂️" title="Пока ничего нет">Нажмите на нужное ниже: кредиты, квартира, связь, подписки, фитнес</Empty></Card>
        )}

        {MANDATORY_GROUPS.filter((g) => groups.has(g)).map((g, gi) => {
          const items = groups.get(g)!
          const total = sum(items.map((x) => ({ amount: x.type === 'bill' ? x.item.amount : x.item.remaining > 0 ? Math.min(x.item.monthlyPayment, x.item.remaining) : 0 })))
          return (
            <Card key={g} delay={gi * 40}>
              <Head right={<span className="num text-[15px]">{fmtMoney(total)}</span>}>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUPS[g].color }} />{GROUPS[g].label}</span>
              </Head>
              <ul className="divide-y divide-line">
                {items.map((x) => x.type === 'bill' ? (
                  <li key={x.item.id}>
                    <button type="button" onClick={() => open({ kind: 'obligation', bill: x.item })} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-60">
                      <CatIcon cat={catInfo(data.categories, x.item.category)} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{x.item.name}</p>
                        <p className="text-[13px] text-ink2">каждое {x.item.day} число</p>
                      </div>
                      <span className="num text-[15px]">{fmtMoney(x.item.amount)}</span>
                    </button>
                  </li>
                ) : (
                  <li key={x.item.id}>
                    <button type="button" onClick={() => open({ kind: 'obligation', debt: x.item })} className="w-full py-2.5 text-left active:opacity-60">
                      <div className="flex items-center gap-3">
                        <CatIcon cat={catInfo(data.categories, x.item.category)} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{x.item.name}</p>
                          <p className="text-[13px] text-ink2">
                            {x.item.remaining > 0
                              ? `осталось ${fmtMoney(x.item.remaining)} · ≈ ${Math.ceil(x.item.remaining / x.item.monthlyPayment)} мес.`
                              : 'погашен 🎉'}
                          </p>
                        </div>
                        <span className="num text-[15px]">{fmtMoney(x.item.monthlyPayment)}</span>
                      </div>
                      <div className="mt-2 pl-[52px]"><Bar value={x.item.total - x.item.remaining} max={x.item.total} color={GROUPS.credit.color} height={6} /></div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}

        {presets.length > 0 && (
          <Card>
            <p className="mb-2 text-[13px] font-semibold text-ink2">Добавить в один клик</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.name} type="button" className="chip"
                  onClick={() => open({ kind: 'obligation', type: p.kind, preset: { name: p.name, category: p.category } })}>
                  {catInfo(data.categories, p.category).icon} {p.name}
                </button>
              ))}
            </div>
          </Card>
        )}
        <p className="px-2 text-center text-[13px] text-ink3">
          Нажмите на платёж, чтобы изменить сумму или дату, удалить его или поставить напоминание в Google Календаре
        </p>
      </section>
    </Screen>
  )
}
