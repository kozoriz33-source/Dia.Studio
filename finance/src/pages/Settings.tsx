import { useState, type FormEvent } from 'react'
import { Card, Field, Page, SectionTitle, Segmented } from '../components/ui'
import { CURRENCIES } from '../lib/format'
import { GROUPS, GROUP_ORDER, ICON_CHOICES } from '../lib/categories'
import { migrate, useStore } from '../lib/store'
import type { GroupId } from '../lib/types'

export default function Settings({ back }: { back: () => void }) {
  const { data, dispatch } = useStore()
  const [name, setName] = useState('')
  const [group, setGroup] = useState<GroupId>('daily')
  const [icon, setIcon] = useState('📦')
  const [backup, setBackup] = useState('')
  const [msg, setMsg] = useState('')

  const usage = (n: string) =>
    data.expenses.filter((e) => e.category === n).length + data.bills.filter((b) => b.category === n).length

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    dispatch({ type: 'addCategory', item: { name: name.trim(), group, icon } })
    setName('')
  }

  const copy = async () => {
    const json = JSON.stringify(data)
    try {
      await navigator.clipboard.writeText(json)
      setMsg('Скопировано. Сохраните текст в заметках или отправьте себе.')
    } catch {
      setBackup(json)
      setMsg('Не удалось скопировать автоматически. Выделите текст ниже и скопируйте вручную.')
    }
  }

  const restore = () => {
    try {
      dispatch({ type: 'replaceAll', data: migrate(JSON.parse(backup)) })
      setMsg('Данные восстановлены.')
      setBackup('')
    } catch {
      setMsg('Текст не похож на резервную копию. Проверьте, что вставили его полностью.')
    }
  }

  return (
    <Page title="Настройки" action={<button type="button" className="btn-ghost !py-2 text-sm" onClick={back}>← Назад</button>}>
      <Card>
        <SectionTitle>Валюта</SectionTitle>
        <Segmented value={data.settings.currency} onChange={(c) => dispatch({ type: 'setCurrency', currency: c })}
          options={CURRENCIES.map((c) => ({ value: c.symbol, label: `${c.symbol} ${c.label}` }))} />
        <p className="mt-2 text-xs text-muted">Меняется только значок. Суммы не пересчитываются по курсу.</p>
      </Card>

      <Card delay={60}>
        <SectionTitle>Категории</SectionTitle>
        <div className="space-y-3">
          {GROUP_ORDER.map((g) => {
            const list = data.categories.filter((c) => c.group === g)
            if (!list.length) return null
            return (
              <div key={g}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: GROUPS[g].color }}>{GROUPS[g].label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((c) => {
                    const used = usage(c.name)
                    return (
                      <span key={c.name} className="chip flex items-center gap-1.5 !pr-1.5">
                        {c.icon} {c.name}
                        <button type="button" disabled={used > 0} aria-label={`Удалить ${c.name}`}
                          title={used ? 'Используется в операциях' : 'Удалить'}
                          onClick={() => dispatch({ type: 'deleteCategory', name: c.name })}
                          className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-bg/60 text-[11px] text-muted disabled:opacity-25">✕</button>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <form onSubmit={add} className="mt-5 space-y-3 border-t border-line pt-4">
          <p className="text-sm font-semibold">Новая категория</p>
          <div className="flex gap-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel2 text-xl">{icon}</span>
            <input className="field" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Field label="Группа">
            <select className="field" value={group} onChange={(e) => setGroup(e.target.value as GroupId)}>
              {GROUP_ORDER.map((g) => <option key={g} value={g}>{GROUPS[g].label}</option>)}
            </select>
          </Field>
          <div className="flex flex-wrap gap-1">
            {ICON_CHOICES.map((i) => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                className={`h-9 w-9 rounded-lg text-lg ${icon === i ? 'bg-accent/25 ring-1 ring-accent' : 'bg-panel2'}`}>{i}</button>
            ))}
          </div>
          <button className="btn w-full" type="submit" disabled={!name.trim()}>Добавить категорию</button>
        </form>
      </Card>

      <Card delay={120}>
        <SectionTitle>Резервная копия</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Данные хранятся только в этом браузере. Раз в месяц копируйте их и сохраняйте в заметках. Так их можно восстановить на другом телефоне.
        </p>
        <button type="button" className="btn w-full" onClick={copy}>Скопировать все данные</button>
        <textarea className="field mt-3 h-24 font-mono text-xs" placeholder="Чтобы восстановить, вставьте сюда скопированный текст"
          value={backup} onChange={(e) => setBackup(e.target.value)} />
        <button type="button" className="btn-ghost mt-2 w-full" disabled={!backup.trim()} onClick={restore}>Восстановить из текста</button>
        {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
      </Card>
    </Page>
  )
}
