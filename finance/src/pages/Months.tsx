import { useState } from 'react'
import { Bar, Card, CatIcon, Pill } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { useUI } from '../components/overlays'
import { byCategory, monthList, monthStats, operationsOf } from '../lib/calc'
import { GROUPS, catInfo } from '../lib/categories'
import { currentMonth, dateLabel, dayLabel, fmtMoney, monthLabel } from '../lib/format'
import { useStore } from '../lib/store'

export default function Months() {
  const { data } = useStore()
  const { open } = useUI()
  const cur = currentMonth()
  const months = monthList(data)
  const [openYm, setOpenYm] = useState<string | null>(cur)

  return (
    <div className="space-y-3">
      <header className="animate-rise pt-1">
        <h1 className="num text-[24px] leading-tight">Месяцы</h1>
        <p className="text-[13px] text-ink2">Сколько получили и потратили в каждом месяце</p>
      </header>

      {months.map((ym, i) => {
        const s = monthStats(data, ym)
        const isOpen = openYm === ym
        const cats = byCategory(s.expenses)
        const ops = operationsOf(s.incomes, s.expenses)
        return (
          <Card key={ym} delay={Math.min(i, 5) * 40} className={s.isFuture ? '!bg-white/60' : ''}>
            <button type="button" className="w-full text-left" onClick={() => setOpenYm(isOpen ? null : ym)}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-bold">{monthLabel(ym)}</h2>
                {s.isFuture ? <Pill tone="accent">прогноз</Pill> : ym === cur ? <Pill tone="dark">сейчас</Pill> : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Доходы" value={s.isFuture ? sumPaydays(data) : s.income} tone="ok" plus />
                <Stat label="Обязательные" value={s.mandatory} />
                <Stat label="Траты" value={s.spent} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-soft px-3 py-2.5">
                <span className="text-[14px] font-semibold">{s.isFuture ? 'Останется (план)' : 'Итог месяца'}</span>
                {(() => {
                  const net = s.isFuture ? sumPaydays(data) - s.mandatory : s.net
                  return <span className={`num text-[18px] ${net < 0 ? 'text-warn' : 'text-ok'}`}>{net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(net))}</span>
                })()}
              </div>
              {ym === cur && s.charged < s.mandatory && (
                <p className="mt-2 text-[12px] text-ink3">Из обязательных уже списано {fmtMoney(s.charged)}, ещё спишется {fmtMoney(s.mandatory - s.charged)}</p>
              )}
            </button>

            {isOpen && (
              <div className="mt-4 animate-fade space-y-4 border-t border-line pt-4">
                {cats.length > 0 && (
                  <div>
                    <p className="label mb-2">На что потратили</p>
                    <ul className="space-y-2.5">
                      {cats.slice(0, 8).map((c) => {
                        const info = catInfo(data.categories, c.name)
                        return (
                          <li key={c.name} className="flex items-center gap-3">
                            <CatIcon cat={info} size={34} />
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex justify-between gap-2 text-[14px]"><span className="truncate font-semibold">{c.name}</span><span className="num">{fmtMoney(c.value)}</span></div>
                              <Bar value={c.value} max={s.spent} color={GROUPS[info.group].color} height={5} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {s.list.length > 0 && (
                  <div>
                    <p className="label mb-2">Обязательные списания</p>
                    <ul className="space-y-1.5">
                      {s.list.map((c) => (
                        <li key={c.key} className="flex items-center gap-2 text-[14px]">
                          <span className="w-14 shrink-0 text-[12px] font-semibold text-ink3">{dateLabel(c.date)}</span>
                          <span>{catInfo(data.categories, c.category).icon}</span>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="num">{fmtMoney(c.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ops.length > 0 && (
                  <div>
                    <p className="label mb-1">Записи · нажмите, чтобы исправить</p>
                    <ul className="divide-y divide-line">
                      {ops.map((o) => (
                        <OperationRow key={o.id} op={o} categories={data.categories} sub={dayLabel(o.date)} onClick={() => open({ kind: 'edit', op: o })} />
                      ))}
                    </ul>
                  </div>
                )}

                {!s.isFuture && ops.length === 0 && <p className="text-[13px] text-ink2">Записей за этот месяц нет. Нажмите «+», чтобы добавить.</p>}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

const sumPaydays = (data: { settings: { paydays: { amount: number }[] } }) =>
  data.settings.paydays.reduce((s, p) => s + p.amount, 0)

const Stat = ({ label, value, tone, plus }: { label: string; value: number; tone?: 'ok'; plus?: boolean }) => (
  <div className="min-w-0">
    <p className="text-[12px] font-medium text-ink2">{label}</p>
    <p className={`num truncate text-[15px] ${tone === 'ok' ? 'text-ok' : ''}`}>{plus ? '+' : '−'}{fmtMoney(value)}</p>
  </div>
)
