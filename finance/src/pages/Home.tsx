import { Card, CatIcon, Empty, Head, Pill, TextBtn } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { useUI } from '../components/overlays'
import { IconCloud, IconGear } from '../components/icons'
import { allOperations, charges, currentBalance, inRange, salaryAround, salaryPlan, sum, topCategories } from '../lib/calc'
import { catInfo } from '../lib/categories'
import { dateLabel, dayLabel, daysBetween, fmtMoney, shiftDays, todayISO, uid } from '../lib/format'
import { useStore, type SyncStatus } from '../lib/store'
import type { TabId } from '../lib/types'

export default function Home({ go }: { go: (t: TabId) => void }) {
  const { data, dispatch, sync } = useStore()
  const { open, toast } = useUI()
  const today = todayISO()
  const { last, next } = salaryAround(data, today)
  const balance = currentBalance(data, today)
  const ops = allOperations(data).slice(0, 5)
  const quick = topCategories(data, 6)
  const hasSalary = data.settings.paydays.length > 0

  // списания до следующей зарплаты
  const untilNext = next ? charges(data, today, shiftDays(next.date, -1)) : []
  const dueBefore = sum(untilNext)
  const daysToNext = next ? daysBetween(today, next.date) - 1 : 0
  const free = balance !== null ? balance - dueBefore : null
  const perDay = free !== null && free > 0 && daysToNext > 0 ? free / daysToNext : 0

  // зарплата сегодня или недавно, но не записана
  const unrecorded = last && daysBetween(last.date, today) <= 5 && sum(inRange(data.incomes, last.date, today)) === 0 ? last : null
  const nextPlan = next ? salaryPlan(data, next, today) : null

  const recordSalary = () => {
    if (!unrecorded) return
    const before = data
    dispatch({ type: 'addIncome', item: { id: uid(), amount: unrecorded.payday.amount, source: unrecorded.payday.name, date: unrecorded.date, note: '', ts: Date.now() } })
    toast(`+${fmtMoney(unrecorded.payday.amount)} · ${unrecorded.payday.name}`, before)
  }

  return (
    <div className="space-y-4">
      <header className="flex animate-rise items-center gap-2 pt-1">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-ink2 first-letter:uppercase">
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="num text-[22px] leading-tight">Мои финансы</h1>
        </div>
        <SyncPill status={sync} onClick={() => go('settings')} />
        <button type="button" onClick={() => go('settings')} aria-label="Настройки"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow-card active:scale-95">
          <IconGear />
        </button>
      </header>

      {/* Главная карточка: до зарплаты */}
      <section className="relative animate-rise overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-float">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#7C5CFF]/30 blur-3xl" />
        <div className="relative">
          {!hasSalary ? (
            <>
              <p className="text-lg font-semibold leading-snug">Начнём: укажите, когда и сколько вы получаете</p>
              <p className="mt-1 text-sm text-white/60">Например, 1-го одна сумма, 15-го другая</p>
              <button type="button" onClick={() => open({ kind: 'salary' })} className="mt-4 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-ink active:scale-95">
                Указать зарплаты
              </button>
            </>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-white/60">
                {next && (daysToNext <= 1 ? `${next.payday.name} завтра · ${dateLabel(next.date)}` : `${next.payday.name} через ${daysToNext} дн. · ${dateLabel(next.date)}`)}
              </p>
              <button type="button" onClick={() => open({ kind: 'balance' })} className="mt-3 block text-left">
                <p className="text-[13px] font-medium text-white/70">Сейчас на руках</p>
                <p className="num mt-1 text-[42px] leading-none">
                  {balance === null ? <span className="text-[28px] text-white/50">нажмите, чтобы указать</span> : fmtMoney(balance)}
                </p>
              </button>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[11px] font-semibold text-white/60">Спишется до зарплаты</p>
                  <p className="num text-[16px]">{fmtMoney(dueBefore)}</p>
                </div>
                <div className={`rounded-2xl p-3 ${free !== null && free < 0 ? 'bg-warn/30' : 'bg-white/10'}`}>
                  <p className="text-[11px] font-semibold text-white/60">{free !== null && free < 0 ? 'Не хватает' : 'Можно в день'}</p>
                  <p className="num text-[16px]">{free === null ? '—' : free < 0 ? fmtMoney(-free) : fmtMoney(perDay)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {unrecorded && (
        <Card className="flex items-center gap-3 !bg-okSoft">
          <span className="text-2xl">💰</span>
          <div className="flex-1">
            <p className="font-semibold">{unrecorded.payday.name} {dateLabel(unrecorded.date)} пришла?</p>
            <p className="text-[13px] text-ink2">Запишу {fmtMoney(unrecorded.payday.amount)}, сумму можно поправить</p>
          </div>
          <button type="button" className="btn !bg-ok !py-2.5 text-sm" onClick={recordSalary}>Да</button>
        </Card>
      )}

      {/* Следующая зарплата: что отложить */}
      {nextPlan && (
        <Card delay={40} onClick={() => go('plan')}>
          <Head right={<span className="text-sm font-semibold text-accent">План →</span>}>
            {next!.payday.name} {dateLabel(next!.date)}
          </Head>
          <div className="space-y-2">
            <Line label="Придёт" value={`+${fmtMoney(nextPlan.income)}`} tone="ok" />
            <Line label={`Отложить на ${nextPlan.list.length} обязательных`} value={`−${fmtMoney(nextPlan.setAside)}`} />
            <div className="flex items-center justify-between border-t border-dashed border-line pt-2">
              <span className="font-bold">Останется</span>
              <span className={`num text-[22px] ${nextPlan.free < 0 ? 'text-warn' : 'text-accent'}`}>{fmtMoney(nextPlan.free)}</span>
            </div>
          </div>
          {nextPlan.list.length > 0 && (
            <p className="mt-2 text-[13px] text-ink2">
              На: {nextPlan.list.slice(0, 4).map((c) => `${c.name} (${dateLabel(c.date)})`).join(', ')}{nextPlan.list.length > 4 ? ` и ещё ${nextPlan.list.length - 4}` : ''}
            </p>
          )}
        </Card>
      )}

      {/* Быстрая запись */}
      <div className="animate-rise" style={{ animationDelay: '60ms' }}>
        <p className="label mb-2 px-1">Быстро записать трату</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {quick.map((c) => (
            <button key={c} type="button" onClick={() => open({ kind: 'quick', category: c })}
              className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] bg-white px-1 py-2.5 shadow-card active:scale-95">
              <CatIcon cat={catInfo(data.categories, c)} size={40} />
              <span className="line-clamp-1 w-full px-1 text-center text-[11px] font-semibold">{c}</span>
            </button>
          ))}
          <button type="button" onClick={() => open({ kind: 'quick', mode: 'income' })}
            className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] bg-white px-1 py-2.5 shadow-card active:scale-95">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-okSoft text-xl">💰</span>
            <span className="text-[11px] font-semibold">Доход</span>
          </button>
        </div>
      </div>

      {/* Ближайшие списания */}
      <Card delay={80}>
        <Head right={<TextBtn onClick={() => go('payments')}>Все</TextBtn>}>Ближайшие списания</Head>
        {data.bills.length + data.credits.length === 0 ? (
          <>
            <Empty icon="📌" title="Добавьте обязательные платежи">Квартира, связь, подписки, фитнес и кредиты: всё, что платите каждый месяц</Empty>
            <button type="button" className="btn w-full" onClick={() => go('payments')}>Добавить</button>
          </>
        ) : (
          <ul className="divide-y divide-line">
            {charges(data, today, shiftDays(today, 40)).slice(0, 4).map((c) => (
              <li key={c.key} className="flex items-center gap-3 py-2.5">
                <CatIcon cat={catInfo(data.categories, c.category)} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-[13px] text-ink2">{dayLabel(c.date)}</p>
                </div>
                <span className="num text-[15px]">−{fmtMoney(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Последние записи */}
      <Card delay={120}>
        <Head right={ops.length > 0 && <TextBtn onClick={() => go('months')}>По месяцам</TextBtn>}>Последние записи</Head>
        {ops.length === 0 ? (
          <Empty icon="🧾">Нажмите «+» внизу: сумма, категория, готово</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {ops.map((o) => (
              <OperationRow key={o.id} op={o} categories={data.categories} sub={dayLabel(o.date)} onClick={() => open({ kind: 'edit', op: o })} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

const Line = ({ label, value, tone }: { label: string; value: string; tone?: 'ok' }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[15px] text-ink2">{label}</span>
    <span className={`num text-[16px] ${tone === 'ok' ? 'text-ok' : ''}`}>{value}</span>
  </div>
)

function SyncPill({ status, onClick }: { status: SyncStatus; onClick: () => void }) {
  const map: Record<SyncStatus, { text: string; tone: 'ok' | 'soft' | 'warn' }> = {
    cloud: { text: 'Сохранено', tone: 'ok' },
    saving: { text: 'Сохраняю…', tone: 'soft' },
    connecting: { text: 'Подключаю…', tone: 'soft' },
    local: { text: 'Только тут', tone: 'warn' },
    error: { text: 'Нет связи', tone: 'warn' },
  }
  const m = map[status]
  return (
    <button type="button" onClick={onClick} aria-label={`Синхронизация: ${m.text}`}>
      <Pill tone={m.tone}><IconCloud /> {m.text}</Pill>
    </button>
  )
}
