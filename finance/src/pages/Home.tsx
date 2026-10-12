import { Bar, Card, CatIcon, Empty, Head, Pill, TextBtn } from '../components/ui'
import OperationRow from '../components/OperationRow'
import { useUI } from '../components/overlays'
import { usePay } from '../components/usePay'
import { IconCheck, IconCloud, IconGear } from '../components/icons'
import { allOperations, byGroup, currentBalance, topCategories } from '../lib/calc'
import { periodPlan } from '../lib/plan'
import { catInfo } from '../lib/categories'
import { dateLabel, dayLabel, fmtMoney, todayISO } from '../lib/format'
import { useStore, type SyncStatus } from '../lib/store'
import type { TabId } from '../lib/types'

export default function Home({ go }: { go: (t: TabId) => void }) {
  const { data, sync } = useStore()
  const { open } = useUI()
  const pay = usePay()
  const plan = periodPlan(data, 0)
  const p = plan.period
  const life = plan.buckets[0]
  const balance = currentBalance(data)
  const groups = byGroup(plan.expenses, data.categories)
  const spentTotal = groups.reduce((a, g) => a + g.value, 0)
  const ops = allOperations(data).slice(0, 5)
  const quick = topCategories(data, 6)
  const overdue = plan.unpaid.filter((e) => e.overdue)
  const soon = plan.unpaid.filter((e) => !e.overdue).slice(0, 4)
  const shortfall = balance !== null ? plan.toPay - balance : 0
  const hasIncome = plan.income > 0
  const today = todayISO()

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

      {/* Главная карточка */}
      <section className="relative animate-rise overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-float">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#7C5CFF]/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-white/60">
              {p.byPayday ? `До зарплаты ${plan.daysLeft === 1 ? 'остался 1 день' : `${plan.daysLeft} дн.`} · ${dateLabel(p.next)}` : `${p.label} · ещё ${plan.daysLeft} дн.`}
            </p>
            {plan.incomeIsExpected && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">по ожидаемой зарплате</span>}
          </div>

          {hasIncome ? (
            <>
              <p className="mt-3 text-[13px] font-medium text-white/70">{life.left >= 0 ? 'Можно потратить на жизнь' : 'Перерасход по плану'}</p>
              <p className={`num mt-1 text-[42px] leading-none ${life.left < 0 ? 'text-[#FF9A4D]' : ''}`}>{fmtMoney(life.left)}</p>
              {life.left > 0 && <p className="mt-2 text-sm text-white/70">≈ <b className="text-white">{fmtMoney(plan.perDay)}</b> в день</p>}
            </>
          ) : (
            <div className="mt-3">
              <p className="text-lg font-semibold leading-snug">Укажите зарплату, и я распишу бюджет до следующего поступления</p>
              <button type="button" onClick={() => open({ kind: 'salary' })} className="mt-3 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-ink active:scale-95">
                Указать зарплату
              </button>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => open({ kind: 'balance' })} className="rounded-2xl bg-white/10 p-2.5 text-left active:bg-white/15">
              <p className="text-[11px] font-semibold text-white/60">На счету</p>
              <p className="num truncate text-[15px]">{balance === null ? <span className="text-white/60">указать</span> : fmtMoney(balance)}</p>
            </button>
            <button type="button" onClick={() => go('payments')} className="rounded-2xl bg-white/10 p-2.5 text-left active:bg-white/15">
              <p className="text-[11px] font-semibold text-white/60">К оплате</p>
              <p className="num truncate text-[15px]">{fmtMoney(plan.toPay)}</p>
            </button>
            <button type="button" onClick={() => go('history')} className="rounded-2xl bg-white/10 p-2.5 text-left active:bg-white/15">
              <p className="text-[11px] font-semibold text-white/60">Потрачено</p>
              <p className="num truncate text-[15px]">{fmtMoney(plan.spent)}</p>
            </button>
          </div>
        </div>
      </section>

      {balance !== null && shortfall > 0 && (
        <Card className="!bg-warnSoft">
          <p className="font-semibold text-warn">Не хватает {fmtMoney(shortfall)} на обязательные платежи до {p.byPayday ? 'зарплаты' : 'конца месяца'}</p>
          <p className="mt-0.5 text-[13px] text-ink2">На счету {fmtMoney(balance)}, а заплатить нужно {fmtMoney(plan.toPay)}. Отложите необязательные траты.</p>
        </Card>
      )}

      {/* Быстрая запись */}
      <div className="animate-rise" style={{ animationDelay: '40ms' }}>
        <p className="label mb-2 px-1">Быстро записать</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {quick.map((c) => {
            const cat = catInfo(data.categories, c)
            return (
              <button key={c} type="button" onClick={() => open({ kind: 'quick', category: c })}
                className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] bg-white px-1 py-2.5 shadow-card active:scale-95">
                <CatIcon cat={cat} size={40} />
                <span className="line-clamp-1 w-full px-1 text-center text-[11px] font-semibold">{c}</span>
              </button>
            )
          })}
          <button type="button" onClick={() => open({ kind: 'quick', mode: 'income' })}
            className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[20px] bg-white px-1 py-2.5 shadow-card active:scale-95">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-okSoft text-xl">💰</span>
            <span className="text-[11px] font-semibold">Доход</span>
          </button>
        </div>
      </div>

      {/* Платежи */}
      {(overdue.length > 0 || soon.length > 0 || data.bills.length + data.debts.length === 0) && (
        <Card delay={80}>
          <Head right={<TextBtn onClick={() => go('payments')}>Все платежи</TextBtn>}>Ближайшие платежи</Head>
          {data.bills.length + data.debts.length === 0 ? (
            <Empty icon="📅" title="Добавьте обязательные платежи">Кредиты, подписки, связь, квартира, фитнес. Я буду напоминать и учитывать их в бюджете.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {[...overdue, ...soon].map((e) => (
                <li key={e.key} className="flex items-center gap-3 py-2.5">
                  <CatIcon cat={catInfo(data.categories, e.category)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.name}</p>
                    <p className={`text-[13px] ${e.overdue ? 'font-semibold text-warn' : 'text-ink2'}`}>
                      {e.overdue ? `Просрочено · ${dateLabel(e.date)}` : e.date === today ? 'Сегодня' : dayLabel(e.date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="num text-[15px]">{fmtMoney(e.amount)}</span>
                    <button type="button" onClick={() => pay(e)}
                      className={`rounded-full px-3 py-1 text-[12px] font-bold active:scale-95 ${e.overdue ? 'bg-warn text-white' : 'bg-ink text-white'}`}>
                      Оплатить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.bills.length + data.debts.length === 0 && (
            <button type="button" className="btn w-full" onClick={() => go('payments')}>Добавить платежи</button>
          )}
        </Card>
      )}
      {data.bills.length + data.debts.length > 0 && overdue.length + soon.length === 0 && (
        <Card delay={80} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-okSoft text-ok"><IconCheck /></span>
          <p className="flex-1 text-sm font-semibold">Все обязательные платежи до {p.byPayday ? 'зарплаты' : 'конца месяца'} оплачены</p>
        </Card>
      )}

      {/* Траты */}
      <Card delay={120} onClick={() => go('plan')}>
        <Head right={<span className="text-sm font-semibold text-accent">План →</span>}>Траты за период</Head>
        {spentTotal === 0 ? (
          <p className="text-sm text-ink2">Пока ничего не потрачено. Нажмите «+», чтобы записать первую трату.</p>
        ) : (
          <>
            <div className="mb-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
              {groups.map((g) => <div key={g.id} style={{ width: `${(g.value / spentTotal) * 100}%`, background: g.color }} />)}
            </div>
            <ul className="space-y-1.5">
              {groups.slice(0, 5).map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                  <span className="flex-1">{g.name}</span>
                  <span className="text-ink3">{Math.round((g.value / spentTotal) * 100)}%</span>
                  <span className="num w-24 text-right">{fmtMoney(g.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {hasIncome && (
          <div className="mt-4 space-y-1.5 border-t border-line pt-3">
            <div className="flex justify-between text-[13px]"><span className="text-ink2">На жизнь по плану</span><span className="font-semibold">{fmtMoney(life.actual)} из {fmtMoney(life.planned)}</span></div>
            <Bar value={life.actual} max={life.planned} color="#16A34A" warn={life.left < 0} />
          </div>
        )}
      </Card>

      {/* Последние записи */}
      <Card delay={160}>
        <Head right={ops.length > 0 && <TextBtn onClick={() => go('history')}>Вся история</TextBtn>}>Последние записи</Head>
        {ops.length === 0 ? (
          <Empty icon="🧾">Нажмите «+» внизу: сумма, категория, готово</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {ops.map((o) => (
              <OperationRow key={o.id} op={o} categories={data.categories} sub={dayLabel(o.date)}
                onClick={() => open({ kind: 'edit', op: o })} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

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
