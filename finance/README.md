# Личные финансы (PWA)

React + TypeScript + Vite + Tailwind + Recharts. Данные хранятся в localStorage, бэкенда нет.

```bash
npm install
npm run dev      # разработка
npm run build    # сборка в dist/
npm run preview  # проверка сборки
```

Для установки на телефон выложите содержимое `dist/` на любой HTTPS-хостинг
(`base: './'` — работает из подпапки), откройте в браузере и выберите
«Добавить на экран Домой». Валюта задаётся в `src/lib/format.ts` (`CURRENCY`).
