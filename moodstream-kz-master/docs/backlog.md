# Backlog — MoodStream KZ

Последнее обновление: 2026-04-06

## Приоритеты
- `P0` — блокирует рабочий MVP
- `P1` — сильно повышает качество
- `P2` — после стабилизации ядра

## Phase 1 — Stable Core MVP ✅

| ID | P | Тема | Задача | Статус |
|----|---|------|--------|--------|
| T-001 | P0 | Infra | Docker Compose: postgres + redis + minio | DONE |
| T-002 | P0 | Backend | Fastify setup + health endpoint | DONE |
| T-003 | P0 | Backend | Prisma schema + первая миграция | DONE |
| T-004 | P0 | Auth | Auth module: register/login/OTP/JWT | DONE |
| T-005 | P0 | Catalog | Catalog module: published-only треки + search | DONE |
| T-006 | P0 | Player | Stream endpoint: range requests, S3 | DONE |
| T-007 | P0 | Library | Library module: likes, saves | DONE |
| T-008 | P0 | Admin | Admin API: catalog CRUD, publish/unpublish | DONE |
| T-009 | P0 | Data | Seed: 10-20 треков казахских артистов | DONE |
| T-010 | P0 | Mobile | Expo setup + навигация + i18n (kk/ru/en) | DONE |
| T-011 | P0 | Mobile | Auth screens: login, register, OTP | DONE |
| T-012 | P0 | Mobile | Home screen + каталог | DONE |
| T-013 | P0 | Mobile | Плеер: MiniPlayer + FullPlayer + seek | DONE |
| T-014 | P1 | Mobile | Library screen: лайки, сохранения | DONE |
| T-015 | P1 | Mobile | Search screen | DONE |
| T-016 | P1 | Admin | Admin SPA: Vite + React + Tailwind | DONE |
| T-017 | P1 | Admin | Catalog browse/search/filter/detail | DONE |
| T-018 | P1 | Admin | Publish/unpublish/delete треков | DONE |

## Phase 2 — Library & Offline Trust ✅

| ID | P | Тема | Задача | Статус |
|----|---|------|--------|--------|
| T-019 | P1 | Offline | Offline status на карточке трека | DONE |
| T-020 | P1 | Offline | Download manager (expo-file-system/legacy) | DONE |
| T-021 | P1 | Library | Offline/liked/saved как явные секции | DONE |
| T-022 | P1 | Library | Библиотека как главный хаб продукта | DONE |

## Phase 3 — Discovery & Charts ✅

| ID | P | Тема | Задача | Статус |
|----|---|------|--------|--------|
| T-023 | P1 | Charts | Казахстанские чарты (Top KZ) | DONE |
| T-024 | P1 | Recs | Рекомендации (по артистам лайков) | DONE |
| T-025 | P1 | Recs | Feedback controls (скрыть трек/артиста) | DONE |
| T-026 | P2 | Search | Транслитерация kk/ru/en в поиске | DONE |
| T-027 | P2 | Recs | Play events backend + mobile logging | DONE |

## Phase 4 — KZ-First Hardening ✅

| ID | P | Тема | Задача | Статус |
|----|---|------|--------|--------|
| T-028 | P1 | i18n | Полный KK/RU/EN copy | DONE |
| T-029 | P1 | Local | Раздел "Казахстанская музыка" + locale-aware секции | DONE |
| T-030 | P2 | Sub | Подписка в KZT (UI-заглушка 990₸/мес) | DONE |
| T-031 | P2 | Profile | Настройки языка и offline в Profile screen | DONE |

## Phase 5 — Navigation & Content Depth ✅

| ID | P | Тема | Задача | Статус |
|----|---|------|--------|--------|
| T-032 | P1 | Mobile | Страница артиста (app/artist/[id].tsx) | DONE |
| T-033 | P1 | Mobile | Страница альбома (app/album/[id].tsx) | DONE |
| T-034 | P1 | Mobile | Очередь воспроизведения (QueueSheet) | DONE |
| T-035 | P2 | Admin | Ingestion UI: загрузка MP3 + очередь | DONE |
| T-036 | P2 | Infra | CI/CD: GitHub Actions (typecheck + lint) | DONE |
| T-037 | P2 | Backend | Refresh token в httpOnly cookie | DONE |
| T-038 | P1 | Mobile | Навигация: артист из Search + FullPlayer | DONE |

## Правило добавления задач

Задача попадает в backlog только если:
- поддерживает KZ-first или music-first цель
- не ломает offline/library/admin приоритет
- не создаёт фейковую кнопку или частично-живой UI
- не размывает прозрачность каталога
