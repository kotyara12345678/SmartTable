<h1>UI часть</h1>

<br>Для того что бы запустить проект необходимо для начала установаить node_modules 

```bash
cd sheets\src\electron
```

```bash
npm install
```

<br>После чего запускаем

```bash
npm run dev
```




```
sheets/src/electron/
├── src/
│   ├── ui/
│   │   ├── components/           # UI компоненты
│   │   │   ├── TopBarComponent.ts
│   │   │   └── RibbonComponent.ts
│   │   ├── core/                 # Ядро UI
│   │   │   ├── ai/
│   │   │   │   ├── ai-service.ts      # AI сервис (API ключи, промты, запросы)
│   │   │   │   └── ai-agent.ts        # AI агент (будущий)
│   │   │   ├── formulas/         # Формулы
│   │   │   ├── component.ts      # Базовый класс компонента
│   │   │   ├── widget.ts         # Базовый класс виджета
│   │   │   ├── widget-loader.ts  # Загрузчик виджетов
│   │   │   └── ipc-handlers.ts   # IPC обработчики
│   │   ├── styles/               # CSS модули
│   │   │   ├── variables.css
│   │   │   ├── top-bar.css
│   │   │   ├── ribbon.css
│   │   │   ├── formula-bar.css
│   │   │   ├── spreadsheet.css
│   │   │   └── ai-panel.css
│   │   ├── templates/            # HTML шаблоны
│   │   │   ├── top-bar.html
│   │   │   ├── ribbon.html
│   │   │   ├── formula-bar.html
│   │   │   ├── spreadsheet.html
│   │   │   ├── ai-panel.html
│   │   │   └── context-menu.html
│   │   ├── icons/
│   │   └── widgets/
│   ├── api/
│   ├── app.ts                    # Главный файл приложения
│   ├── main.ts                   # Electron main процесс (только окно/меню)
│   ├── preload.ts                # Preload скрипт
│   └── index.html
├── dist/                         # Скомпилированный код
├── package.json
├── tsconfig.json
└── copy-assets.js
```