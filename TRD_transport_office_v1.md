# TRD — Система управления задачами Проектного офиса
## Администрация по логистике и транспорту Республики Казахстан

**Версия:** 1.0  
**Дата:** 24 мая 2026  
**На основе:** PRD_transport_office_v2.md  
**Руководитель:** Алуа  
**Статус:** Черновик

---

## 1. Назначение документа

Технические требования к информационной системе управления задачами Проектного офиса по транспорту и логистике. Документ описывает архитектуру, модели данных, интеграции и нефункциональные требования, необходимые для реализации функциональности, заданной в PRD v2.0.

---

## 2. Контекст системы

Проектный офис ведёт 52 задачи по 4 транспортным направлениям (авиация, ж/д, авто, беспилотники) силами команды из 5 человек. Система должна обеспечить:
- централизованный трекинг задач с приоритетами и статусами;
- агрегированную отчётность для руководителя и министерств;
- контроль сроков и международных треков.

---

## 3. Архитектура системы

### 3.1 Верхнеуровневая схема

```
┌────────────────────────────────────────────────┐
│                 Web / Mobile UI                 │
│          (React + TypeScript / PWA)             │
└───────────────────┬────────────────────────────┘
                    │ REST / WebSocket
┌───────────────────▼────────────────────────────┐
│               API Gateway (Node.js)             │
│         Auth  │  Tasks  │  Reports  │  Notify  │
└──┬────────────┴────┬────┴─────┬─────┴────┬─────┘
   │                 │          │           │
┌──▼──┐  ┌──────────▼──┐  ┌───▼────┐  ┌──▼──────┐
│Auth │  │  Task Service│  │Reports │  │Notifica-│
│Svc  │  │  (CRUD+Flow) │  │Service │  │tion Svc │
└──┬──┘  └──────┬───────┘  └───┬────┘  └──┬──────┘
   │             │              │           │
┌──▼─────────────▼──────────────▼───────────▼─────┐
│             PostgreSQL (основная БД)             │
│             Redis (кэш + очередь)                │
└──────────────────────────────────────────────────┘
```

### 3.2 Компоненты

| Компонент | Технология | Назначение |
|-----------|-----------|-----------|
| Frontend | React 18, TypeScript, Tailwind | UI, Kanban-доска, дашборды |
| API Gateway | Node.js 20, Express / Fastify | Маршрутизация, rate-limit |
| Auth Service | Keycloak / JWT + OAuth 2.0 | Аутентификация, роли |
| Task Service | Node.js / Go | CRUD задач, бизнес-логика |
| Reports Service | Python 3.12 (pandas) | Генерация отчётов, PDF |
| Notification Service | Node.js, WebSocket | Push, email, дедлайн-алерты |
| Database | PostgreSQL 16 | Основное хранилище |
| Cache / Queue | Redis 7 | Кэш запросов, очередь уведомлений |
| File Storage | S3-совместимое хранилище | Вложения к задачам |
| CI/CD | GitHub Actions / GitLab CI | Автодеплой |

---

## 4. Модель данных

### 4.1 Основные сущности

```sql
-- Направления (aviaцia, zh_d, auto, drony, common)
CREATE TABLE directions (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20) UNIQUE NOT NULL,  -- 'avia', 'rail', 'auto', 'drone', 'general'
    name_ru     VARCHAR(100) NOT NULL
);

-- Пользователи
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    role        VARCHAR(20) NOT NULL  -- 'head', 'analyst'
        CHECK (role IN ('head', 'analyst')),
    direction_id INT REFERENCES directions(id),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Типы задач
CREATE TABLE task_types (
    id      SERIAL PRIMARY KEY,
    code    VARCHAR(30) UNIQUE NOT NULL,  -- 'project','analytics','research','report','meeting','note','order'
    name_ru VARCHAR(60) NOT NULL
);

-- Задачи
CREATE TABLE tasks (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    assignee_id     INT NOT NULL REFERENCES users(id),
    direction_id    INT NOT NULL REFERENCES directions(id),
    task_type_id    INT NOT NULL REFERENCES task_types(id),
    priority        SMALLINT NOT NULL DEFAULT 2
        CHECK (priority IN (1, 2, 3)),       -- 1=high🔴, 2=medium🟡, 3=low
    status          VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'in_progress', 'review', 'done', 'blocked')),
    due_date        DATE,
    parent_task_id  INT REFERENCES tasks(id),  -- для подзадач
    is_urgent       BOOLEAN DEFAULT false,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Международные треки (партнёры)
CREATE TABLE international_tracks (
    id              SERIAL PRIMARY KEY,
    partner_name    VARCHAR(150) NOT NULL,
    direction_id    INT REFERENCES directions(id),
    responsible_id  INT REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    notes           TEXT,
    task_id         INT REFERENCES tasks(id)  -- привязка к задаче
);

-- История изменений статуса
CREATE TABLE task_history (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id),
    changed_by  INT NOT NULL REFERENCES users(id),
    old_status  VARCHAR(20),
    new_status  VARCHAR(20),
    comment     TEXT,
    changed_at  TIMESTAMPTZ DEFAULT now()
);

-- Вложения
CREATE TABLE task_attachments (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id),
    file_name   VARCHAR(255),
    file_url    VARCHAR(500),
    uploaded_by INT REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Индексы производительности

```sql
CREATE INDEX idx_tasks_assignee   ON tasks(assignee_id);
CREATE INDEX idx_tasks_direction  ON tasks(direction_id);
CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_tasks_priority   ON tasks(priority);
CREATE INDEX idx_tasks_due_date   ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_task_history_task ON task_history(task_id);
```

---

## 5. API — спецификация эндпоинтов

### 5.1 Задачи

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/tasks` | Список задач (фильтр: assignee, direction, status, priority, due_from, due_to) |
| POST | `/api/v1/tasks` | Создать задачу |
| GET | `/api/v1/tasks/:id` | Получить задачу |
| PATCH | `/api/v1/tasks/:id` | Обновить поля задачи |
| DELETE | `/api/v1/tasks/:id` | Удалить задачу (soft delete) |
| PATCH | `/api/v1/tasks/:id/status` | Изменить статус (запись в task_history) |
| GET | `/api/v1/tasks/:id/history` | История изменений |

### 5.2 Пользователи и направления

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/users` | Список сотрудников |
| GET | `/api/v1/directions` | Справочник направлений |
| GET | `/api/v1/directions/:code/tasks` | Задачи по направлению |

### 5.3 Отчёты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/reports/summary` | Сводная таблица (по PRD §8) |
| GET | `/api/v1/reports/overdue` | Просроченные задачи |
| GET | `/api/v1/reports/quarterly` | Квартальный отчёт по направлениям |
| POST | `/api/v1/reports/export` | Экспорт в PDF / XLSX |

### 5.4 Формат ответа (стандарт)

```json
{
  "data": { ... },
  "meta": { "total": 52, "page": 1, "per_page": 20 },
  "error": null
}
```

---

## 6. Бизнес-логика и правила

### 6.1 Приоритеты и сроки

- При создании задачи без срока и с `priority=1` система автоматически устанавливает `is_urgent=false`; аналитик должен вручную указать срок.
- Задача переходит в статус `blocked` только с обязательным комментарием.
- Статус `done` необратим без права головы (`role=head`).
- Квартальный отчёт (срок 01.06.2026) и записка о приоритетах Q3 (10.06.2026) — системные задачи с `is_urgent=true` и авто-напоминанием за 7 и 2 дня.

### 6.2 Подзадачи

- TMTM разбит на два поднаправления (море + Rail Digital) → `parent_task_id`.
- Transit КПИ 55 млн тонн → три дочерних задачи (rail / auto / air).
- Cargo Terminal → четыре дочерних задачи (Астана, Алматы, Актобе, Шымкент).

### 6.3 Уведомления

| Триггер | Получатель | Канал |
|---------|-----------|-------|
| Срок задачи через 7 дней | Исполнитель | Email + Push |
| Срок задачи через 2 дня | Исполнитель + Руководитель | Email + Push |
| Срок задачи просрочен | Исполнитель + Руководитель | Email |
| Статус изменён | Руководитель | Push |
| Новая задача назначена | Исполнитель | Email + Push |

---

## 7. Роли и доступ

| Действие | Аналитик | Руководитель |
|----------|----------|-------------|
| Просмотр своих задач | ✅ | ✅ |
| Просмотр всех задач | ❌ | ✅ |
| Создание задачи | ✅ (на себя) | ✅ (на любого) |
| Изменение статуса | ✅ | ✅ |
| Отметить как `done` | ❌ (только `review`) | ✅ |
| Удаление задачи | ❌ | ✅ |
| Генерация отчётов | Только свои | Все |
| Управление пользователями | ❌ | ✅ |

---

## 8. Интеграции

### 8.1 Текущие (MVP)

| Система | Тип | Описание |
|---------|-----|----------|
| Email SMTP | Исходящий | Уведомления о дедлайнах |
| S3 Storage | Файловый | Вложения к задачам |

### 8.2 Плановые (Phase 2)

| Система | Тип | Описание |
|---------|-----|----------|
| КЕДЕН | Входящий API | Синхронизация статусов E-Freight (задача Арай) |
| КТЖ Data | Входящий API | Показатели ж/д для KPI 55 млн тонн (задача Дианы) |
| Министерство транспорта | Webhook | Уведомления об изменениях НПА |
| Государственные закупки | Входящий | Данные по гос. тендерам (задача Арай) |

### 8.3 Экспорт

- PDF-отчёт — шаблон на основе структуры PRD §8 (сводная таблица).
- XLSX-экспорт с фильтром по периоду, направлению, сотруднику.
- Word-шаблон аналитической записки (на основе типовой формы Администрации).

---

## 9. Нефункциональные требования

### 9.1 Производительность

| Метрика | Требование |
|---------|-----------|
| Время ответа API (p95) | ≤ 300 мс |
| Время загрузки дашборда | ≤ 2 с |
| Одновременных пользователей | ≥ 50 (команда + министерства) |
| Хранение данных | 5 лет (требования госархива РК) |

### 9.2 Надёжность и доступность

| Метрика | Требование |
|---------|-----------|
| Uptime | 99.5% (плановые работы — ночь воскресенья) |
| RTO (восстановление) | ≤ 4 часа |
| RPO (потеря данных) | ≤ 1 час |
| Резервное копирование | Ежедневно, хранение 90 дней |

### 9.3 Безопасность

- Аутентификация: SSO через Keycloak / интеграция с AD Администрации.
- Все данные в транзите: TLS 1.3.
- Данные в покое: шифрование AES-256.
- Логирование всех API-вызовов с изменением данных (audit log).
- Соответствие требованиям законодательства РК о защите персональных данных.
- Хранение данных исключительно на серверах в РК (локализация).

### 9.4 Масштабируемость

- Горизонтальное масштабирование Task Service и API Gateway через контейнеры (Docker / Kubernetes).
- Партиционирование `task_history` по `changed_at` (ежеквартально).

---

## 10. UI/UX требования

### 10.1 Основные экраны

| Экран | Описание |
|-------|----------|
| Дашборд руководителя | Сводная таблица §8, KPI прогресс, топ-5 срочных задач |
| Kanban-доска | Колонки: Новая → В работе → На проверке → Готово → Заблокировано |
| Список задач | Таблица с фильтрами: сотрудник, направление, приоритет, статус, срок |
| Карточка задачи | Все поля + история + вложения + подзадачи |
| Международные треки | Таблица §9 PRD с обновляемыми статусами |
| Отчёты | Квартальный отчёт, экспорт PDF/XLSX |

### 10.2 Требования к интерфейсу

- Язык интерфейса: русский (основной), казахский (дополнительный, Phase 2).
- Адаптивный дизайн: десктоп (1920px+), планшет (768px+).
- Цветовая кодировка приоритетов: 🔴 красный (#EF4444), 🟡 жёлтый (#F59E0B), зелёный (#10B981).
- Тёмная тема — опционально.

---

## 11. Этапы реализации

### Phase 1 — MVP (6 недель)

| Неделя | Задача |
|--------|-------|
| 1–2 | Настройка инфраструктуры, схема БД, Auth Service |
| 3–4 | Task Service (CRUD), базовый UI (список + карточка) |
| 5 | Уведомления по email, Kanban-доска |
| 6 | Квартальный отчёт + экспорт PDF, UAT с командой |

**Критерий готовности Phase 1:** все 52 задачи из PRD импортированы в систему, команда работает в системе, квартальный отчёт генерируется автоматически до 01.06.2026.

### Phase 2 — Интеграции (4 недели после Phase 1)

- Подключение КЕДЕН (E-Freight).
- KPI-дашборд 55 млн тонн (данные ж/д, авиа, авто).
- Казахский язык интерфейса.
- Word-шаблон аналитических записок.

---

## 12. Открытые вопросы

| # | Вопрос | Ответственный | Срок |
|---|--------|--------------|------|
| 1 | Использовать AD Администрации для SSO или отдельный Keycloak? | Алуа + ИТ-служба | 30.05.2026 |
| 2 | Хостинг: государственное облако (GOCloud.kz) или собственные серверы? | Алуа | 30.05.2026 |
| 3 | Нужна ли интеграция с системой государственных закупок (портал goszakup.gov.kz)? | Арай | 05.06.2026 |
| 4 | Формат экспорта аналитических записок — шаблон Администрации или свободный? | Алуа | 05.06.2026 |
| 5 | Доступ министерств (МТ РК) — только просмотр отчётов или полноценный доступ? | Алуа | 10.06.2026 |

---

## Приложение A — Начальный датасет

При развёртывании системы загружаются данные из PRD v2.0:
- 5 пользователей (Алуа, Арай, Диана, Ерхан, Асыл) с ролями и направлениями.
- 52 задачи с приоритетами, типами и статусами.
- 8 международных треков (IATA, IRU, DPWorld, Global Gateway, China Border, Inditex, Qatar Airways, E-Freight/КЕДЕН).

---

*Документ подготовлен на основе PRD_transport_office_v2.md*  
*Версия: 1.0 | Дата: 24.05.2026 | Следующий пересмотр: 30.05.2026*
