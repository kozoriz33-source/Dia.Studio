import { Bar, Card, CatIcon, Empty, Head, Screen } from '../components/ui'
import { useUI } from '../components/overlays'
import { creditLeft, creditMonthsLeft, creditNext, monthlyMandatory, salaryAround, sum } from '../lib/calc'
import { BILL_PRESETS, CREDIT_PRESETS, GROUPS, catInfo } from '../lib/categories'
import { dateLabel, dueDate, fmtMoney, monthOf, todayISO } from '../lib/format'
import { useStore } from '../lib/store'

export default function Payments() {
  const { data } = useStore()
  const { open } = useUI()
  const today = todayISO()
  const mm = monthlyMandatory(data, today)
  const bills = [...data.bills].sort((a, b) => a.day - b.day)
  const credits = [...data.credits].sort((a, b) => a.day - b.day)
  const salaryTotal = sum(data.settings.paydays)
  const left = salaryTotal - mm.total
  const billPresets = BILL_PRESETS.filter((p) => !data.bills.some((b) => b.category === p.category))
  const creditPresets = CREDIT_PRESETS.filter((p) => !data.credits.some((c) => c.category === p.category))
  const multiPay = data.settings.paydays.length > 1
  const payName = (d?: number) => data.settings.paydays.find((p) => p.day === d)
  const { next } = salaryAround(data, today)

  const status = (day: number) => {
    const d = dueDate(monthOf(today), day)
    return d <= today ? `списано ${dateLabel(d)}` : `спишется ${dateLabel(d)}`
  }

  return (
    <Screen title="Обязательные">
      {/* Итог в месяц */}
      <section className="relative animate-rise overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-float">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#7C5CFF]/50 blur-3xl" />
        <div className="relative">
          <p className="text-[13px] font-semibold text-white/60">Нужно платить каждый месяц</p>
          <p className="num mt-1 text-[40px] leading-none">{fmtMoney(mm.total)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-semibold text-white/60">Платежи · {bills.length}</p>
              <p className="num text-[16px]">{fmtMoney(mm.bills)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[11px] font-semibold text-white/60">Кредиты · {credits.length}</p>
              <p className="num text-[16px]">{fmtMoney(mm.credits)}</p>
            </div>
          </div>
          {salaryTotal > 0 && (
            <div className="mt-3 space-y-1 rounded-2xl bg-white/10 p-3 text-[14px]">
              <div className="flex justify-between"><span className="text-white/70">Зарплаты в месяц</span><span className="num">+{fmtMoney(salaryTotal)}</span></div>
              <div className="flex justify-between"><span className="text-white/70">Обязательные</span><span className="num">−{fmtMoney(mm.total)}</span></div>
              <div className="flex justify-between border-t border-white/15 pt-1 font-bold">
                <span>Остаётся</span><span className={`num ${left < 0 ? 'text-[#FF9A4D]' : 'text-[#9DB2FF]'}`}>{fmtMoney(left)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ежемесячные платежи */}
      <Card delay={40}>
        <Head right={<button type="button" onClick={() => open({ kind: 'bill' })} className="rounded-full bg-ink px-3 py-1.5 text-[13px] font-bold text-white active:scale-95">+ Платёж</button>}>
          Ежемесячные платежи
        </Head>
        {bills.length === 0 ? (
          <Empty icon="🏠">Квартира, коммуналка, связь, интернет, подписки, фитнес, страховка</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {bills.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => open({ kind: 'bill', item: b })} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-60">
                  <CatIcon cat={catInfo(data.categories, b.category)} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.name}</p>
                    <p className="text-[13px] text-ink2">
                      {b.day} числа · {status(b.day)}
                      {multiPay && payName(b.fromDay) ? ` · с выплаты ${b.fromDay}-го` : ''}
                    </p>
                  </div>
                  <span className="num text-[16px]">{fmtMoney(b.amount)}</span>
                </button>
              </li>
            ))}
            <li className="flex justify-between pt-2.5 text-[14px] font-bold"><span>Итого</span><span className="num">{fmtMoney(mm.bills)}</span></li>
          </ul>
        )}
        {billPresets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
            {billPresets.map((p) => (
              <button key={p.name} type="button" className="chip" onClick={() => open({ kind: 'bill', preset: p })}>
                + {catInfo(data.categories, p.category).icon} {p.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Кредиты */}
      <Card delay={80}>
        <Head right={<button type="button" onClick={() => open({ kind: 'credit' })} className="rounded-full bg-ink px-3 py-1.5 text-[13px] font-bold text-white active:scale-95">+ Кредит</button>}>
          Кредиты
        </Head>
        {credits.length === 0 ? (
          <Empty icon="💳">Телефон, машина, кредитка: платёж в месяц и сколько осталось</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {credits.map((c) => {
              const l = creditLeft(c, today)
              const nx = creditNext(c, today)
              const startTotal = c.remaining
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => open({ kind: 'credit', item: c })} className="w-full py-3 text-left active:opacity-60">
                    <div className="flex items-center gap-3">
                      <CatIcon cat={catInfo(data.categories, c.category)} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name}</p>
                        <p className="text-[13px] text-ink2">
                          {l > 0 ? `${c.day} числа · следующий ${nx ? dateLabel(nx.date) : '—'}` : 'выплачен 🎉'}
                        </p>
                      </div>
                      <span className="num text-[16px]">{fmtMoney(l > 0 ? Math.min(c.monthly, l) : 0)}</span>
                    </div>
                    {l > 0 && (
                      <div className="mt-2 pl-[54px]">
                        <div className="mb-1 flex justify-between text-[12px] text-ink2">
                          <span>осталось {fmtMoney(l)}</span><span>≈ {creditMonthsLeft(c, today)} мес.</span>
                        </div>
                        <Bar value={startTotal - l} max={startTotal} color={GROUPS.credit.color} height={6} />
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
            <li className="flex justify-between pt-2.5 text-[14px] font-bold"><span>Итого в месяц</span><span className="num">{fmtMoney(mm.credits)}</span></li>
          </ul>
        )}
        {creditPresets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
            {creditPresets.map((p) => (
              <button key={p.name} type="button" className="chip" onClick={() => open({ kind: 'credit', preset: p })}>
                + {catInfo(data.categories, p.category).icon} {p.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      <p className="px-2 text-center text-[13px] text-ink3">
        Платежи списываются сами в свой день, отмечать их не нужно. Нажмите на платёж, чтобы изменить его или поставить напоминание.
        {next ? ` Ближайшая зарплата: ${dateLabel(next.date)}.` : ''}
      </p>
    </Screen>
  )
}
