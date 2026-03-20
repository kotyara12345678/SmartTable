# Сборка и запуск SmartTable

## Требования

- Node.js 18+
- npm 9+

## Установка зависимостей

```bash
cd sheets/src/electron
npm install
```

## Разработка

Запуск в режиме разработки с автосборкой:

```bash
npm run watch
```

В другом терминале запустите Electron:

```bash
npm start
```

## Сборка

Скомпилировать TypeScript в JavaScript:

```bash
npm run build
```

Это выполнит:
1. Компиляцию `.ts` файлов в `.js`
2. Копирование ассетов (CSS, HTML, изображения) в `dist/`

## Запуск готового приложения

После сборки:

```bash
npm start
```

## Структура проекта

```
sheets/src/electron/
├── src/                    # Исходный код TypeScript
│   ├── main.ts            # Главный процесс Electron
│   ├── preload.ts         # Preload скрипт
│   ├── app.ts             # Инициализация приложения
│   ├── ui/                # UI компоненты
│   │   ├── core/          # Ядро: формулы, AI, плагины
│   │   ├── widgets/       # Виджеты: renderer, charts
│   │   ├── components/    # Компоненты: Dashboard, Settings
│   │   └── templates/     # HTML шаблоны
│   └── styles/            # CSS стили
├── dist/                   # Скомпилированный код (не в git)
├── package.json
└── tsconfig.json
```

## Модули

Проект использует модульную архитектуру:

- **formulas.ts** — система формул (IF, SUM, VLOOKUP и др.)
- **renderer/modules/** — модули отрисовки таблицы
- **formulabar/** — панель формул с автокомплитом
- **ai/** — AI помощник для работы с таблицами

## Тестирование формул

Откройте приложение и введите в ячейку:

```
=IF(A1>10, "Больше", "Меньше")
=SUM(A1:A10)
=IFS(A1>90, "A", A1>70, "B", TRUE, "C")
```

## Отладка

Включите DevTools в главном окне (F12) для просмотра консоли.

Логи выводятся в консоль с префиксами:
- `[Renderer]` — отрисовка таблицы
- `[Formula]` — вычисление формул
- `[AI]` — AI запросы
- `[Plugin]` — плагины

## Сборка дистрибутива

Создать исполняемый файл для вашей ОС:

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

Дистрибутивы появятся в папке `release/`.

## Переменные окружения

Для AI функциональности создайте `.env`:

```
OPENAI_API_KEY=your_key_here
```

## Частые проблемы

### Module not found

Убедитесь что импорты заканчиваются на `.js`:
```typescript
import { func } from './module.js'; // ✅
import { func } from './module';    // ❌
```

### Фокус теряется

Focus Manager автоматически восстанавливает фокус. Если проблема остаётся:
```typescript
import { restoreFocus } from './formulabar/formulas-renderer.js';
restoreFocus();
```

### Формулы не работают

Проверьте что импорты правильные:
```typescript
import { evaluateFormula } from './core/formulas/formulas.js';
```

## Вклад в проект

1. Fork репозиторий
2. Создайте ветку (`feature/my-feature`)
3. Закоммитьте изменения
4. Отправьте в remote
5. Создайте Pull Request

## Лицензия

MIT
