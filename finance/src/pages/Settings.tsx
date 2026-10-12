import { useState, type FormEvent } from 'react'
import { Card, Field, Head, Screen } from '../components/ui'
import { useUI } from '../components/overlays'
import { IconBack } from '../components/icons'
import { currentBalance } from '../lib/calc'
import { CURRENCIES, fmtMoney } from '../lib/format'
import { GROUPS, GROUP_ORDER, ICON_CHOICES } from '../lib/categories'
import { migrate, useStore } from '../lib/store'
import type { GroupId } from '../lib/types'

export default function Settings({ back }: { back: () => void }) {
  const { data, dispatch, sync } = useStore()
  const { open, toast } = useUI()
  const [name, setName] = useState('')
  const [group, setGroup] = useState<GroupId>('daily')
  const [icon, setIcon] = useState('📦')
  const [backup, setBackup] = useState('')
  const [msg, setMsg] = useState('')
  const balance = currentBalance(data)

  const usage = (n: string) =>
    data.expenses.filter((e) => e.category === n).length + data.bills.filter((b) => b.category === n).length + data.debts.filter((d) => d.category === n).length

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'addCategory', item: { name: name.trim(), group, icon } })
    toast(`Категория «${name.trim()}» добавлена`)
    setName('')
  }

  const copy = async () => {
    const json = JSON.stringify(data)
    try {
      await navigator.clipboard.writeText(json)
      setMsg('Скопировано. Вставьте в заметки или отправьте себе в мессенджер.')
    } catch {
      setBackup(json)
      setMsg('Автоматически скопировать не получилось. Выделите текст в поле ниже и скопируйте.')
    }
  }

  const restore = () => {
    try {
      const d = migrate(JSON.parse(backup))
      dispatch({ type: 'replaceAll', data: { ...d, updatedAt: Date.now() } })
      setMsg('Данные восстановлены.')
      setBackup('')
    } catch {
      setMsg('Это не похоже на резервную копию. Проверьте, что вставили текст целиком.')
    }
  }

  const syncText = {
    cloud: '☁️ Данные сохраняются в вашем аккаунте Claude и не пропадут, даже если закрыть приложение или открыть ссылку на другом устройстве.',
    saving: '☁️ Сохраняю изменения в ваш аккаунт…',
    connecting: '⏳ Подключаюсь к хранилищу…',
    local: '⚠️ Облачное хранилище недоступно в этом окне. Данные сохраняются только в этом браузере. Откройте ссылку, войдя в свой аккаунт Claude.',
    error: '⚠️ Нет связи с хранилищем. Изменения сохранены в браузере и отправятся, когда связь вернётся.',
  }[sync]

  return (
    <Screen title="Настройки" left={
      <button type="button" onClick={back} aria-label="Назад" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-card active:scale-95"><IconBack /></button>
    }>
      <Card><p className="text-[14px] leading-relaxed text-ink2">{syncText}</p></Card>

      <Card delay={40} className="!p-0">
        <SettingRow label="Зарплата" value={data.settings.payday ? `${data.settings.payday} числа · ${fmtMoney(data.settings.salary)}` : 'не указана'} onClick={() => open({ kind: 'salary' })} />
        <SettingRow label="Сейчас на счету" value={balance === null ? 'не указано' : fmtMoney(balance)} onClick={() => open({ kind: 'balance' })} />
        <div className="px-4 py-3.5">
          <p className="mb-2 font-semibold">Валюта</p>
          <div className="flex flex-wrap gap-1.5">
            {CURRENCIES.map((c) => (
              <button key={c.symbol} type="button" onClick={() => dispatch({ type: 'setSettings', patch: { currency: c.symbol } })}
                className={`chip ${data.settings.currency === c.symbol ? 'chip-on' : ''}`}>{c.symbol} {c.label}</button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink3">Меняется только значок, суммы не пересчитываются по курсу.</p>
        </div>
      </Card>

      <Card delay={80}>
        <Head>Категории</Head>
        <div className="space-y-3">
          {GROUP_ORDER.map((g) => {
            const list = data.categories.filter((c) => c.group === g)
            if (!list.length) return null
            return (
              <div key={g}>
                <p className="mb-1.5 text-[12px] font-bold" style={{ color: GROUPS[g].color }}>{GROUPS[g].label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((c) => {
                    const used = usage(c.name) > 0
                    return (
                      <span key={c.name} className="chip flex items-center gap-1.5 !pr-1.5">
                        {c.icon} {c.name}
                        <button type="button" disabled={used} aria-label={`Удалить ${c.name}`} title={used ? 'Используется в записях' : 'Удалить'}
                          onClick={() => dispatch({ type: 'deleteCategory', name: c.name })}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-soft text-[10px] text-ink2 disabled:opacity-25">✕</button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <form onSubmit={add} className="mt-5 space-y-3 border-t border-line pt-4">
          <p className="font-bold">Своя категория</p>
          <div className="flex gap-2">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft text-2xl">{icon}</span>
            <input className="field" placeholder="Например: Сигареты, Барбер" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Field label="Группа">
            <select className="field" value={group} onChange={(e) => setGroup(e.target.value as GroupId)}>
              {GROUP_ORDER.map((g) => <option key={g} value={g}>{GROUPS[g].label}</option>)}
            </select>
          </Field>
          <div className="flex flex-wrap gap-1">
            {ICON_CHOICES.map((i) => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                className={`h-10 w-10 rounded-xl text-xl ${icon === i ? 'bg-accentSoft ring-2 ring-accent' : 'bg-soft'}`}>{i}</button>
            ))}
          </div>
          <button className="btn w-full" type="submit" disabled={!name.trim()}>Добавить категорию</button>
        </form>
      </Card>

      <Card delay={120}>
        <Head>Резервная копия</Head>
        <p className="mb-3 text-sm text-ink2">На всякий случай раз в месяц копируйте данные текстом и храните в заметках.</p>
        <button type="button" className="btn w-full" onClick={copy}>Скопировать все данные</button>
        <textarea className="field mt-3 h-24 font-mono text-xs" placeholder="Чтобы восстановить, вставьте сюда скопированный текст"
          value={backup} onChange={(e) => setBackup(e.target.value)} />
        <button type="button" className="btn-soft mt-2 w-full" disabled={!backup.trim()} onClick={restore}>Восстановить из текста</button>
        {msg && <p className="mt-2 text-sm font-medium text-accent">{msg}</p>}
      </Card>
    </Screen>
  )
}

const SettingRow = ({ label, value, onClick }: { label: string; value: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3.5 text-left active:bg-soft">
    <span className="font-semibold">{label}</span>
    <span className="flex items-center gap-1 text-sm text-ink2">{value} <span className="text-ink3">›</span></span>
  </button>
)
