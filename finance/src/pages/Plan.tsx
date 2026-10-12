import { useState } from 'react'
import { Bar, Card, Empty, Screen } from '../components/ui'
import { useUI } from '../components/overlays'
import { salaryAround, salaryPlan } from '../lib/calc'
import { catInfo } from '../lib/categories'
import { dateLabel, daysBetween, fmtMoney, todayISO, weekdayShort } from '../lib/format'
import { useStore } from '../lib/store'
import type { PlanShares } from '../lib/types'

export default function Plan() {
  const { data, dispatch } = useStore()
  const { open } = useUI()
  const today = todayISO()
  const { last, upcoming } = salaryAround(data, today, 3)
  const options = [...(last ? [last] : []), ...upcoming]
  const defaultIdx = !last || (upcoming[0] && daysBetween(today, upcoming[0].date) <= 8) ? (last ? 1 : 0) : 0
  const [idx, setIdx] = useState(defaultIdx)
  const shares = data.settings.plan

  if (!options.length) {
    return (
      <Screen title="План">
        <Card>
          <Empty icon="🧭" title="Сначала укажите зарплаты">Когда и сколько приходит. После этого я посчитаю, сколько отложить на обязательные и сколько остаётся</Empty>
          <button type="button" className="btn w-full" onClick={() => open({ kind: 'salary' })}>Указать зарплаты</button>
        </Card>
      </Screen>
    )
  }

  const sel = options[Math.min(idx, options.length - 1)]
  const p = salaryPlan(data, sel, today)
  const step = (key: keyof PlanShares, d: number) =>
    dispatch({ type: 'setPlan', plan: { ...shares, [key]: Math.max(0, Math.min(100, shares[key] + d)) } })

  return (
    <Screen title="План">
      {/* Выбор зарплаты */}
      <div className="-mx-4 flex animate-rise gap-2 overflow-x-auto px-4 pb-1">
        {options.map((o, i) => {
          const on = o === sel
          const isLast = o === last
          return (
            <button key={o.date + o.payday.id} type="button" onClick={() => setIdx(i)}
              className={`shrink-0 rounded-2xl px-3.5 py-2.5 text-left transition active:scale-95 ${on ? 'bg-ink text-white' : 'bg-white shadow-card'}`}>
              <p className={`text-[11px] font-semibold ${on ? 'text-white/60' : 'text-ink3'}`}>{isLast ? 'Текущая' : `через ${daysBetween(today, o.date) - 1} дн.`}</p>
              <p className="text-[14px] font-bold">{o.payday.name} {dateLabel(o.date)}</p>
            </button>
          )
        })}
      </div>

      {/* Расчёт */}
      <Card>
        <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => open({ kind: 'salary' })}>
          <div>
            <p className="font-bold">{sel.payday.name} {dateLabel(sel.date)}</p>
            <p className="text-[13px] text-ink2">{p.received > 0 ? 'получено' : p.status === 'future' ? 'ожидается' : 'ожидалась'} · до {dateLabel(p.next)}</p>
          </div>
          <span className="num text-[22px] text-ok">+{fmtMoney(p.income)}</span>
        </button>

        <div className="mt-4 rounded-2xl bg-soft p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">Отложить на обязательные</p>
            <span className="num text-[17px]">−{fmtMoney(p.setAside)}</span>
          </div>
          {p.list.length === 0 ? (
            <p className="text-[13px] text-ink2">С этой зарплаты нет обязательных платежей</p>
          ) : (
            <ul className="space-y-1.5">
              {p.list.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-[14px]">
                  <span className="w-[62px] shrink-0 text-[12px] font-semibold text-ink3">{dateLabel(c.date)} {weekdayShort(c.date)}</span>
                  <span>{catInfo(data.categories, c.category).icon}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="num whitespace-nowrap">{fmtMoney(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <p className="font-bold">Остаётся</p>
          <p className={`num text-[32px] leading-none ${p.free < 0 ? 'text-warn' : 'text-accent'}`}>{fmtMoney(p.free)}</p>
        </div>
        {p.free < 0 && (
          <p className="mt-3 rounded-2xl bg-warnSoft p-3 text-[13px] text-warn">
            Этой зарплаты не хватает на обязательные платежи: не хватает {fmtMoney(-p.free)}. Перенесите часть платежей на другую зарплату во вкладке «Обязательные».
          </p>
        )}
      </Card>

      {/* Распределение */}
      {p.free > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[17px] font-bold">Куда деть {fmtMoney(p.free)}</h2>
            <span className={`text-[12px] font-bold ${p.totalShare === 100 ? 'text-ink3' : 'text-warn'}`}>{p.totalShare}%</span>
          </div>
          {p.totalShare !== 100 && (
            <p className="-mt-1 px-1 text-[13px] text-warn">
              {p.totalShare < 100 ? `Не распределено ${100 - p.totalShare}% (${fmtMoney((p.free * (100 - p.totalShare)) / 100)})` : `Больше 100% на ${p.totalShare - 100}%`}
            </p>
          )}
          {p.buckets.map((b, i) => {
            const over = b.left < 0
            const showActual = p.status !== 'future'
            return (
              <Card key={b.key} delay={i * 40}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-xl" style={{ background: `${b.color}1A` }}>{b.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{b.label}</p>
                    <p className="num text-[20px]" style={{ color: b.color }}>{fmtMoney(b.planned)}</p>
                  </div>
                  <div className="flex items-center rounded-2xl bg-soft p-1">
                    <button type="button" aria-label="Меньше" onClick={() => step(b.key, -5)} className="h-8 w-8 rounded-xl text-lg font-bold text-ink2 active:bg-white">−</button>
                    <span className="w-10 text-center text-sm font-bold">{b.share}%</span>
                    <button type="button" aria-label="Больше" onClick={() => step(b.key, 5)} className="h-8 w-8 rounded-xl text-lg font-bold text-ink2 active:bg-white">+</button>
                  </div>
                </div>
                <p className="mt-1 text-[13px] text-ink2">
                  {b.key === 'life' ? `≈ ${fmtMoney(b.planned / p.days)} в день · ${b.hint}` : b.hint}
                </p>
                {showActual && (
                  <div className="mt-3">
                    <Bar value={b.actual} max={b.planned} color={b.color} warn={b.key === 'life' && over} />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className={`text-[13px] ${over && b.key === 'life' ? 'font-semibold text-warn' : 'text-ink2'}`}>
                        {b.key === 'life'
                          ? over ? `Перерасход ${fmtMoney(-b.left)}` : `Потрачено ${fmtMoney(b.actual)} · осталось ${fmtMoney(b.left)}${p.status === 'current' ? ` · ${fmtMoney(p.perDay)}/день` : ''}`
                          : b.left > 0 ? `Отложено ${fmtMoney(b.actual)} · ещё ${fmtMoney(b.left)}` : '✓ Отложено'}
                      </p>
                      {b.category && b.left > 0 && p.status === 'current' && (
                        <button type="button" className="rounded-full bg-ink px-3 py-1 text-[12px] font-bold text-white active:scale-95"
                          onClick={() => open({ kind: 'quick', category: b.category })}>Отложить</button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
          <p className="px-2 text-[13px] leading-relaxed text-ink2">
            💡 В день зарплаты сразу переведите сумму на обязательные на отдельный счёт или в копилку, тогда точно хватит. Проценты меняются кнопками − и +.
          </p>
        </section>
      )}

    </Screen>
  )
}
