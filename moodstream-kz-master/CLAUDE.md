# CLAUDE.md — MoodStream KZ + Ruflo v3.5

Дата создания: 2026-04-05 | Ruflo v3.5: 2026-04-07
Рабочая директория: `C:\project\claude work`

Этот файл — главный операционный контекст для Claude Code во всех сессиях.
Читай его первым в каждой сессии перед любой работой.

---

## Context
This is a software engineering environment. You are an autonomous coding agent operating on a real codebase.

Your goal is to produce correct, maintainable, production-quality code while minimizing unnecessary changes.

---
##Навигация по контексту 
1.Всегда запращивайте граф знаний сначала
2.Читай необработанные файлы, только если явно так скажу
## Workflow Orchestration

### Plan Mode
- Enter plan mode for any non-trivial task (3+ steps)
- Break work into clear, sequential steps
- Identify risks and unknowns before coding
- Write a concise but complete plan

- If execution deviates or fails:
  - STOP immediately
  - Re-enter plan mode
  - Update the plan before continuing

### Execution
- Execute only after a clear plan exists
- Follow the plan step-by-step
- Do not skip steps or improvise without reason
- Keep changes minimal and focused

---

## Subagent Strategy

- Use subagents to isolate tasks and reduce context load
- Assign one well-defined task per subagent
- Prefer parallel execution when tasks are independent
- Aggregate results in the main agent

- For complex problems:
  - Decompose aggressively
  - Use more subagents rather than overloading one

---

## Decision Making

- Do not guess — verify
- Prefer explicitness over assumptions
- If uncertain:
  - Investigate
  - Or ask for clarification

- State assumptions clearly when necessary

---

## Code Quality

- Write clear, readable, maintainable code
- Prefer simple solutions over clever ones
- Avoid hacks unless explicitly requested
- Follow existing project conventions

- Refactor when:
  - It improves clarity
  - It reduces duplication
  - It aligns with architecture

- Do not introduce unnecessary abstractions

---

## Change Management

- Make the smallest possible change that solves the problem
- Do not modify unrelated code
- Preserve existing behavior unless explicitly changing it

- Before modifying code:
  - Understand surrounding context
  - Check for dependencies and side effects

---

## Testing & Validation

- Always validate your changes
- Run existing tests when available
- Add tests for new behavior when appropriate

- If tests fail:
  - Fix the issue before continuing
  - Do not ignore failures

- Manually reason about correctness when tests are absent

---

## Error Handling

- Never silently fail
- Surface errors clearly
- Handle edge cases explicitly

- If something unexpected happens:
  - Stop
  - Investigate root cause
  - Do not continue blindly

---

## Debugging

- Reproduce issues before fixing
- Narrow down the problem scope
- Avoid shotgun debugging

- Prefer:
  - Logs
  - Targeted checks
  - Minimal changes

---

## Knowledge & File Access

- Prefer structured/contextual sources over raw files
- Do not read entire files unless necessary
- Focus only on relevant sections

- Avoid unnecessary file reads
- Avoid redundant operations

---

## Communication

- Be concise and direct
- Do not explain obvious things
- Focus on decisions and results
- **Default mode: Caveman (full)** — drop articles, fragments OK, short synonyms, no filler. Off only on "normal mode" / "stop caveman".

- When presenting work:
  - Show what changed
  - Explain why (briefly)

---

## Safety Constraints

- Never delete production data
- Never introduce breaking changes without explicit intent
- Do not expose secrets or credentials

---

## Performance & Efficiency

- Avoid unnecessary computation
- Prefer efficient algorithms when relevant
- Do not prematurely optimize

---

## Learning Loop

- After each mistake:
  - Identify the root cause
  - Update CLAUDE.md to prevent recurrence

- Continuously refine behavior
- Prefer evolving rules over repeating mistakes

---

## General Philosophy

- Correctness > speed
- Simplicity > complexity
- Clarity > cleverness

- You are not a chatbot
- You are an autonomous engineer

Act accordingly.

---

## Поведенческие правила (всегда соблюдать)

- Делай только то, что было запрошено — ничего больше, ничего меньше
- НИКОГДА не создавай файлы, если они не абсолютно необходимы для цели
- ВСЕГДА предпочитай редактировать существующий файл вместо создания нового
- НИКОГДА не создавай документацию (*.md) или README-файлы без явного запроса
- НИКОГДА не сохраняй рабочие файлы, тексты или тесты в корневую папку
- Никогда не проверяй статус после запуска роя агентов — жди результатов
- ВСЕГДА читай файл перед его редактированием
- НИКОГДА не коммить секреты, учётные данные или .env файлы
- НИКОГДА не пропускай хуки (--no-verify, --no-gpg-sign и т.п.) без явного запроса

---

## Принцип отладки — Root Cause First

Когда встречаешь ошибку, баг, падение теста или нестабильное поведение — найди и устрани корневую причину.

1. Воспроизведи ошибку и зафикси точный симптом.
2. Определи цепочку причин.
3. Исправляй первоисточник, а не место проявления.
4. Не делай маскирующих правок: не добавляй костыльные проверки, не подавляй исключения, не отключай тесты/линтер/типизацию ради зелёного статуса.
5. Если ошибка в общем механизме — исправляй механизм, а не частный случай.
6. После исправления проверь соседние места на тот же класс проблемы.
7. По возможности добавь или обнови тест.
8. В финале сообщай: корневая причина → что исправлено → почему это корень → как проверено.

---

## Режим работы — строгая экономия токенов

1. Сначала краткий план (до 5 строк).
2. Не сканируй весь проект — выбери 1-3 наиболее вероятных файла/папки.
3. Читай только минимально нужные фрагменты.
4. Не повторяй содержимое файлов и диффов — давай только выжимку.
5. Не перечитывай уже просмотренные файлы без новой причины.
6. Если задача расплывчатая — задай один уточняющий вопрос.
7. Для простых задач не предлагай много альтернатив.
8. Если нужно менять много файлов — сначала план, затем узкий порядок действий.
9. Если контекст разрастается — предложи компактное резюме.
10. В финале кратко: что сделал, какие файлы затронул, как проверить.

Формат ответа: **План → Действие → Результат → Проверка**

---

## Параллельность — 1 сообщение = все связанные операции

- Все связанные операции ДОЛЖНЫ быть параллельными в одном сообщении
- ВСЕГДА группируй все задачи в ОДНОМ вызове TodoWrite
- ВСЕГДА запускай всех агентов в ОДНОМ сообщении через Task tool
- ВСЕГДА группируй все операции чтения/записи файлов в ОДНОМ сообщении
- ВСЕГДА группируй все команды bash в ОДНОМ сообщении

---

## Миссия

Построить **KZ-first, music-first** стриминговый сервис для Казахстана.
Оптимизировать не по числу фич, а по качеству ежедневного прослушивания, надёжности, локальной релевантности и операционному качеству.

**Одна строка:** MoodStream — казахстанский музыкальный стриминг, который выигрывает библиотекой, офлайном, прозрачными рекомендациями, видимостью казахских артистов и AI-помощью в каталоге.

---

## Продуктовые принципы (никогда не нарушать)

- `music-first` — никаких подкастов, видео, соцсетей в MVP
- `library-first` — библиотека и плейлисты важнее discovery
- `offline-first` — офлайн не фича, а архитектурное требование
- `control-first` — пользователь управляет рекомендациями
- `transparent catalog` — треки не исчезают без объяснения
- `local relevance` — казахские артисты и чарты в ядре продукта
- `reliability before AI magic` — стабильный плеер важнее умных рекомендаций
- `no fake affordances` — если кнопка не работает, её нет

---

## Технический стек

### Backend (`backend/`)
- **Runtime:** Node.js 20+ ESM
- **Framework:** Fastify 5 + TypeScript strict
- **ORM:** Prisma 6 + PostgreSQL 16
- **Auth:** JWT (access 15min + refresh 30d), phone OTP + email magic link
- **Storage:** S3-совместимый (MinIO локально, R2/S3 в prod)
- **Cache:** Redis 7
- **Queue:** BullMQ (на Redis) — для ingestion и метаданных
- **Search:** PostgreSQL full-text + trigram на старте; Meilisearch опционально позже

### Mobile (`mobile/`)
- **Stack:** React Native 0.81 + Expo 54 + Expo Router 6 + TypeScript strict
- **Audio:** expo-av → react-native-track-player (план миграции в Phase 2)
- **State:** Zustand (глобальный) + TanStack Query (server state)
- **Offline:** expo-file-system + SQLite (expo-sqlite) для кэша
- **i18n:** i18next + react-i18next, языки: `kk`, `ru`, `en`

### Admin (`admin/`)
- **Stack:** React + Vite + TypeScript
- **UI:** Tailwind CSS
- **State:** TanStack Query
- Отдельное SPA, деплоится независимо

### Инфраструктура (`infra/`)
- **Local dev:** Docker Compose (postgres, redis, minio)
- **Env:** `.env` файлы per-service, `.env.example` в репо
- **CI:** GitHub Actions (lint + typecheck + test)

---

## Архитектурные принципы

- Следуй Domain-Driven Design с ограниченными контекстами
- Держи файлы до 500 строк
- Используй типизированные интерфейсы для всех публичных API
- Предпочитай TDD London School (mock-first) для нового кода
- Используй event sourcing для изменений состояния
- Валидация входных данных — только на системных границах (user input, external APIs)

---

## Структура репозитория

```
C:\project\claude work\
├── CLAUDE.md                  ← этот файл
├── docker-compose.yml          ← postgres + redis + minio
├── .env.example
│
├── backend/
│   ├── src/
│   │   ├── domain/            ← shared types, enums, primitives
│   │   ├── db/                ← prisma client singleton
│   │   ├── modules/
│   │   │   ├── auth/          ← регистрация, вход, токены, OTP
│   │   │   ├── catalog/       ← треки, релизы, артисты, поиск
│   │   │   ├── library/       ← лайки, сохранения, история
│   │   │   ├── playlists/     ← создание, редактирование, шаринг
│   │   │   ├── player/        ← стриминг, очередь воспроизведения
│   │   │   ├── recommendations/ ← миксы, рекомендации, feedback
│   │   │   ├── offline/       ← синхронизация, offline-статусы
│   │   │   ├── charts/        ← казахстанские и глобальные чарты
│   │   │   ├── ingestion/     ← загрузка треков, нормализация метаданных
│   │   │   ├── moderation/    ← очереди дубликатов и проверки
│   │   │   └── admin/         ← admin API endpoints
│   │   ├── plugins/           ← fastify plugins (auth, cors, errors)
│   │   ├── utils/
│   │   └── index.ts           ← entry point
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── (auth)/            ← login, register, onboarding
│   │   ├── (tabs)/
│   │   │   ├── index.tsx      ← home / discovery
│   │   │   ├── search.tsx     ← поиск
│   │   │   ├── library.tsx    ← библиотека
│   │   │   └── profile.tsx    ← профиль + настройки
│   │   ├── player/            ← полноэкранный плеер
│   │   ├── artist/[id].tsx
│   │   ├── album/[id].tsx
│   │   └── playlist/[id].tsx
│   ├── components/
│   │   ├── player/            ← MiniPlayer, FullPlayer, ProgressBar
│   │   ├── track/             ← TrackRow, TrackCard
│   │   ├── library/           ← LibrarySection, LikedSongs
│   │   └── ui/                ← Button, Text, Icon, etc.
│   ├── store/                 ← Zustand stores
│   │   ├── player.ts
│   │   ├── auth.ts
│   │   └── offline.ts
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts             ← axios/fetch client + interceptors
│   │   └── i18n.ts            ← i18next setup
│   ├── locales/
│   │   ├── kk.json
│   │   ├── ru.json
│   │   └── en.json
│   ├── constants/
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── admin/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── catalog/       ← browse, detail, edit
│   │   │   ├── ingestion/     ← очередь, bulk approve
│   │   │   ├── moderation/    ← дубликаты, проверки
│   │   │   ├── charts/        ← управление чартами
│   │   │   └── users/         ← поиск, ban, поддержка
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── tsconfig.json
│
└── docs/
    ├── architecture.md
    ├── api.md
    ├── backlog.md
    └── decisions/             ← ADR-файлы
```

---

## Команды

```bash
# Backend
cd backend && npm run dev          # Fastify dev server (port 3000)
cd backend && npm run typecheck    # TypeScript check
cd backend && npm run db:migrate   # prisma migrate dev
cd backend && npm run db:seed      # seed данные

# Mobile
cd mobile && npm run start         # Expo dev server
cd mobile && npm run android       # Android
cd mobile && npm run ios           # iOS
cd mobile && npm run typecheck     # TypeScript check

# Admin
cd admin && npm run dev            # Vite dev server (port 5173)

# Инфраструктура
docker compose up -d               # postgres + redis + minio
docker compose down
```

---

## База данных — ключевые инварианты

- Consumer-facing треки: `isPublished = true` AND `playbackStatus = "PLAYABLE"`
- `catalogVisibilityReason` — всегда объясняет, почему трек виден или скрыт
- Доступность (`AvailabilityStatus`) хранится отдельно от каталога: `GEO_BLOCKED`, `RIGHTS_HOLD`, `TAKEDOWN`
- Мутации библиотеки и плейлистов — append-only с BigInt cursor для offline-синхронизации
- Locale fallback: `kk → ru → en`
- Territory fallback: `KZ → KG,UZ → GLOBAL`

## API соглашения

- `GET /api/v1/*` — публичные и авторизованные consumer endpoints
- `GET /api/admin/*` — только ADMIN / CATALOG_MANAGER роли
- Пагинация — cursor-based: `{ items[], nextCursor: string | null }`
- Ошибки — RFC 7807 ProblemDetails: `{ code, message, details? }`
- Locale и territory — в заголовках: `Accept-Language: ru`, `X-Territory: KZ`
- Streaming audio — `GET /stream/:trackId` с range request support

## Безопасность

- JWT secret в env, никогда не в коде
- Refresh tokens — httpOnly cookie
- OTP rate limiting: 3 попытки / 5 мин на номер
- Admin endpoints — отдельный middleware, проверка роли
- File upload — валидация MIME, размер, сканирование
- SQL — только Prisma ORM, никаких raw queries с user input

## Локализация

- Интерфейс по умолчанию: `ru`
- Поддержка: `kk`, `ru`, `en`
- Переводы в `mobile/locales/*.json` и `admin/src/locales/*.json`
- Артист/трек могут иметь `localizedTitle` для разных локалей
- Поиск должен работать на всех трёх языках + транслитерация

---

## Текущая фаза: Phase 1 — ЗАВЕРШЕНА ✓
### Задачи Phase 1
| ID | Задача | Статус |
|----|--------|--------|
| T-001 | Docker Compose: postgres + redis + minio | DONE |
| T-002 | Backend: Fastify setup + health endpoint | DONE |
| T-003 | Backend: Prisma schema + первая миграция | DONE |
| T-004 | Backend: Auth module (register/login/OTP/JWT) | DONE |
| T-005 | Backend: Catalog module (published-only, search) | DONE |
| T-006 | Backend: Player/stream endpoint | DONE |
| T-007 | Backend: Library module (likes, saves) | DONE |
| T-008 | Backend: Admin API (catalog CRUD) | DONE |
| T-009 | Backend: Seed данные (KZ артисты + треки) | DONE |
| T-010 | Mobile: Expo setup + навигация + i18n | DONE |
| T-011 | Mobile: Auth screens (login, OTP) | DONE |
| T-012 | Mobile: Home screen + каталог | DONE |
| T-013 | Mobile: Плеер (MiniPlayer + FullPlayer + seek) | DONE |
| T-014 | Mobile: Library screen (лайки, сохранения) | DONE |
| T-015 | Mobile: Search screen | DONE |
| T-016 | Admin: Vite SPA + React + Tailwind | DONE |
| T-017 | Admin: Catalog browse/search/filter/detail | DONE |
| T-018 | Admin: Publish/unpublish UI | DONE |

### Phase 2 — Library & Offline Trust ✓
| ID | Задача | Статус |
|----|--------|--------|
| T-019 | Mobile: Offline status на карточке трека | DONE |
| T-020 | Mobile: Download manager (expo-file-system/legacy) | DONE |
| T-021 | Mobile: Offline/liked/saved как явные секции в Library | DONE |
| T-022 | Mobile: Библиотека как главный хаб продукта | DONE |

### Phase 3 — Discovery & Charts ✓
| ID | Задача | Статус |
|----|--------|--------|
| T-023 | Backend: Charts module + GET /api/v1/charts/:slug | DONE |
| T-023 | Mobile: Top KZ чарт на Home screen | DONE |
| T-024 | Рекомендации (по артистам лайков) + секция на Home | DONE |
| T-025 | Feedback controls (скрыть трек/артиста) — long-press | DONE |
| T-026 | Транслитерация kk/ru/en в поиске (backend) | DONE |
| T-027 | Play events: POST /api/v1/player/events + mobile logging | DONE |

### Phase 4 — Polish & Settings ✓
| ID | Задача | Статус |
|----|--------|--------|
| T-028 | Полный KK/RU/EN copy (все экраны, subscription, feedback) | DONE |
| T-029 | Раздел «Казахстанская музыка» — backend locale-aware + home section | DONE |
| T-030 | Подписка в KZT — экран-заглушка с 990₸/мес | DONE |
| T-031 | Profile: переключатель языка + офлайн-хранилище + очистка | DONE |

### Phase 5 — Navigation & Content Depth ✓
| ID | Задача | Статус |
|----|--------|--------|
| T-032 | Mobile: Страница артиста (app/artist/[id].tsx) | DONE |
| T-033 | Mobile: Страница альбома (app/album/[id].tsx) | DONE |
| T-034 | Mobile: Очередь воспроизведения — QueueSheet + кнопка в FullPlayer | DONE |
| T-036 | Infra: CI/CD — GitHub Actions (typecheck backend + mobile + admin) | DONE |
| T-038 | Mobile: Навигация артист из Search + FullPlayer → /artist/:id | DONE |

---

## Анализ и известные проблемы

#### Критично — мешает запуску
| # | Проблема | Решение |
|---|---------|---------|
| 1 | **Admin PATCH endpoint отсутствует** | Реализовать `PATCH /api/admin/catalog/tracks/:id` + роль-проверка |
| 2 | **Refresh token в cookie не реализован** | Переключить на `Set-Cookie: refreshToken=...; HttpOnly; Secure` |
| 3 | **Нет `.env` для backend** | Задокументировать шаг `cp .env.example backend/.env` в README |
| 4 | **Нет `EXPO_PUBLIC_API_URL` в mobile** | Добавить `mobile/.env.example` с реальным IP |

#### Важно — ухудшает качество
| # | Проблема | Решение |
|---|---------|---------|
| 5 | **Нет плейлистов в mobile** | Добавить `app/playlist/[id].tsx` + кнопка "Добавить в плейлист" в TrackRow |
| 10 | **Нет ingestion UI в admin** | Простой upload form: MP3 → backend → queue |

#### Технический долг
| # | Проблема | Решение |
|---|---------|---------|
| 11 | **Нет тестов** | Добавить vitest для backend |
| 13 | **`react-native-track-player` не используется** | Мигрировать в Phase 2 |

---

## Правила работы

1. **Читай этот файл первым** в каждой сессии.
2. **Один поток за раз** — не смешивай backend и mobile в одном PR.
3. **Typecheck перед завершением** — всегда запускай `npm run typecheck` в изменённом сервисе.
4. **Никаких фейковых кнопок** — если функциональность не реализована, убирай UI-элемент или показывай disabled с объяснением.
5. **Consumer API только published треки** — никогда не утекать черновики или заблокированный контент.
6. **Shared-zone файлы** — `prisma/schema.prisma`, `docker-compose.yml`, `CLAUDE.md` — изменять только с явным scope.
7. **Предпочитай минимальный рабочий срез** — потом дотягивай тесты, документацию, именование.
8. **Обновляй статус задачи** в этом файле после завершения (`TODO → DONE`).
9. **Можно писать по-русски или по-английски** — оба языка допустимы.

---

## Ruflo v3.5 — Оркестрация агентов

### Маршрутизация по сложности задачи

**Запускай рой агентов когда задача затрагивает:**
- 3+ файлов одновременно
- Новую фичу целиком
- Рефакторинг нескольких модулей
- API-изменения с тестами
- Изменения схемы БД

**Пропускай рой для:**
- Правок в одном файле
- Простых багфиксов (1-2 строки)
- Обновлений документации
- Изменений конфигурации

### 3-уровневая маршрутизация модели (ADR-026)

| Уровень | Обработчик | Задержка | Стоимость | Кейсы |
|---------|-----------|----------|-----------|-------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Простые трансформы (var→const, добавить типы) |
| **2** | Haiku | ~500ms | $0.0002 | Простые задачи (<30% сложности) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Сложная логика, архитектура, безопасность |

### Конфигурация роя (по умолчанию — Anti-Drift)

- **Топология:** hierarchical (центральная координация предотвращает дрейф)
- **Максимум агентов:** 8 (меньше команда = меньше дрейф)
- **Стратегия:** specialized (чёткие роли, нет перекрытий)
- **Консенсус:** raft (лидер поддерживает авторитетное состояние)
- **Память:** hybrid (SQLite + AgentDB)

```javascript
mcp__ruv-swarm__swarm_init({
  topology: "hierarchical",
  maxAgents: 8,
  strategy: "specialized"
})
```

### Маршрутизация агентов (Anti-Drift)

| Код | Задача | Агенты |
|-----|--------|--------|
| 1 | Bug Fix | coordinator, researcher, coder, tester |
| 3 | Feature | coordinator, architect, coder, tester, reviewer |
| 5 | Refactor | coordinator, architect, coder, reviewer |
| 7 | Performance | coordinator, perf-engineer, coder |
| 9 | Security | coordinator, security-architect, auditor |
| 13 | Docs | researcher, api-docs |

### Доступные агенты (60+ типов)

**Основная разработка:** `coder`, `reviewer`, `tester`, `planner`, `researcher`

**Специализированные:** `security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

**Специализированные для MoodStream:**
- `backend-dev` — Fastify/Prisma/BullMQ задачи
- `mobile-dev` — React Native/Expo задачи
- `system-architect` — архитектурные решения
- `tdd-london-swarm` — тесты с vitest
- `api-docs` — документация API
- `cicd-engineer` — GitHub Actions

### Headless-запуск (claude -p)

```bash
# Одиночная фоновая задача
claude -p "Analyze the authentication module for security issues"

# Параллельный запуск
claude -p "Analyze backend/src/modules/auth/ for vulnerabilities" &
claude -p "Write tests for backend/src/modules/catalog/" &
claude -p "Review mobile/store/ for performance issues" &
wait
```

### CLI-команды Ruflo (v3alpha)

```bash
# Инициализация
npx claude-flow@v3alpha init --wizard

# Агенты
npx claude-flow@v3alpha agent spawn -t coder --name my-coder
npx claude-flow@v3alpha swarm init --v3-mode

# Память
npx claude-flow@v3alpha memory search -q "authentication patterns"

# Диагностика
npx claude-flow@v3alpha doctor --fix
npx claude-flow@v3alpha security scan --depth full

# Фоновые воркеры
npx claude-flow@v3alpha daemon start
npx claude-flow@v3alpha hooks worker list
```

### Хуки (17 хуков + 12 воркеров)

```bash
# Основные хуки
npx claude-flow@v3alpha hooks pre-task --description "[task]"
npx claude-flow@v3alpha hooks post-task --task-id "[id]" --success true
npx claude-flow@v3alpha hooks post-edit --file "[file]" --train-patterns

# Управление сессией
npx claude-flow@v3alpha hooks session-start --session-id "[id]"
npx claude-flow@v3alpha hooks session-end --export-metrics true
```

### Настройка MCP

```bash
claude mcp add claude-flow npx claude-flow@v3alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start        # опционально
```

---

## Phase 6+ — Feature Ideas (Backlog)

### Фича 1: Test Mode (Тестовый профиль)
Изолированная сессия для безопасного эксперимента с музыкой.
- Кнопка "Тест-режим" в главном меню, визуальный индикатор активной сессии
- Все лайки/скипы/плэи пишутся только в тест-сессию (`is_test = true`), не влияют на основной алгоритм
- В конце сессии: перенести понравившееся в основной профиль или удалить без следа
- **БД:** `test_sessions(id, user_id, created_at, ended_at, status)`, `test_interactions(id, session_id, track_id, action, timestamp)`, колонка `is_test` в `interactions`

### Фича 2: Taste Map (Карта вкусов)
Интерактивная визуализация музыкального кругозора пользователя.
- Экран "Моя карта" — пузырьки жанров: размер = частота, расстояние = схожесть
- Клик по ноде → топ-треки жанра у пользователя
- Кнопка "Поделиться" → PNG для соцсетей
- Обновляется раз в неделю, показывает тренд роста/падения
- **Рендер:** D3.js force-directed graph или Canvas API

### Фича 3: Underground Radar (Радар андеграунда)
Лента качественных малоизвестных треков — антипод чартам.
- Фильтр: `plays_count < N` (настраиваемый порог, например < 10 000)
- Скоринг: `cosine_similarity(user, track) * 0.5 + (likes/plays) * 0.3 + freshness * 0.2`
- Карточка: "Всего X прослушиваний в мире"
- Бейдж "Я открыл этот трек" — first-listener механика

### Фича 4: Mood Machine / NL Search (под рассмотрение)
Поиск музыки через текстовое описание сцены на естественном языке.
- Ввод: "Дождливый вечер, кофе, немного грустно" → плейлист 10-20 треков
- Архитектура: текст → LLM (Claude API) → параметры `{energy, valence, tempo, mood[]}` → векторный поиск по аудио-эмбеддингам
- **Требует:** аудио-эмбеддинги треков (Essentia), pgvector или Pinecone

### Фича 5: Live Lyrics (Живой текст) (под рассмотрение)
Синхронизированный текст + визуализация структуры трека.
- LRC-формат с подсветкой текущей строки
- Тайм-лайн: цветные сегменты (intro/verse/chorus/drop/solo/outro)
- Визуальный эффект на дропе (пульсация)
- **Источники:** LRCLIB API (бесплатно), Genius API, Essentia для структуры

### Фича 6: Genre Bridges (Мосты между жанрами)
Плавное расширение вкуса через "переходные" треки между жанрами.
- "Ты слушаешь [Жанр A]. Вот 5 треков — мост в [Жанр B]"
- Алгоритм: треки с `distance(track, centroid_A) / distance(track, centroid_B) ≈ 1.0`
- UI: слайдер "от джаза к электронике" — треки расставлены по шкале
- Новый мост предлагается автоматически раз в неделю
- **Требует:** векторные эмбеддинги треков в БД

### Фича 7: Friends Releases (Релизы друзей)
Лента активности друзей и новинок от артистов из их библиотек.
- Фаза 1: "Артисты которых ты слушаешь выпустили новое" (без соц. графа)
- Фаза 2: социальный граф (`friendships`, `artist_follows`), хронологическая лента
- Фаза 3: real-time через WebSocket / SSE ("3 друга слушают это прямо сейчас")
- Приватность: настройка "кто видит мою активность"

### Фича 8: Taste Clone (Клон вкуса)
Временное прослушивание музыки через живой алгоритм другого пользователя.
- Каталог публичных профилей → "войти в профиль" → рекомендации строятся на его данных
- Алгоритм: 70% история источника + 30% собственный вкус
- Индикатор "Ты слушаешь как [ник]" в плеере
- Основной профиль заморожен на время сессии
- По окончании: перенести понравившееся или удалить
- **БД:** `public_profiles(id, user_id, display_name, genre_tags, is_public)`, `clone_sessions(id, cloner_user_id, source_profile_id, started_at, ended_at)`
- Приватность: источник не знает кто его клонирует

---

## Ссылки на исходные документы

Оригинальные product-документы живут в `C:\project\music-app\`:
- `unified-compact-context-kazakhstan-music-app.md` — единый продуктовый контекст
- `docs/product/roadmap.md` — roadmap по фазам
- `docs/product/backlog.md` — полный backlog (22 задачи)
- `kazakhstan-music-app-mvp-prd-2026-04-05.md` — PRD

Рабочий мобильный прототип: `C:\project\newspotify-app\`
Архитектурный backend с контрактами: `C:\project\music-app\backend\`
Ruflo документация: https://github.com/ruvnet/claude-flow

---

## Design Skills

### Emil Kowalski Design Skill
```bash
npx skills add emilkowalski/skill
```
Навык дизайна от Emil Kowalski — высококачественные UI/UX паттерны и компоненты.

### Impeccable (TasteKill)
```bash
npx skills add pkpkaus/impeccable
```
- Команда: `/polish`
- Score target: **20**
- TasteKill — финальный прогон UI через design taste filter перед завершением задачи.
