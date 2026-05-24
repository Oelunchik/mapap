-- =============================================
-- MAPAP — Миграция схемы БД
-- Проектный офис по транспорту и логистике РК
-- =============================================

CREATE TABLE IF NOT EXISTS directions (
    id       SERIAL PRIMARY KEY,
    code     VARCHAR(20) UNIQUE NOT NULL,
    name_ru  VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    full_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    role         VARCHAR(20) NOT NULL DEFAULT 'analyst'
                 CHECK (role IN ('head', 'analyst')),
    direction_id INT REFERENCES directions(id),
    is_active    BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_types (
    id      SERIAL PRIMARY KEY,
    code    VARCHAR(30) UNIQUE NOT NULL,
    name_ru VARCHAR(60) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    assignee_id     INT NOT NULL REFERENCES users(id),
    direction_id    INT NOT NULL REFERENCES directions(id),
    task_type_id    INT NOT NULL REFERENCES task_types(id),
    priority        SMALLINT NOT NULL DEFAULT 2
                    CHECK (priority IN (1, 2, 3)),
    status          VARCHAR(20) NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','in_progress','review','done','blocked')),
    due_date        DATE,
    parent_task_id  INT REFERENCES tasks(id),
    is_urgent       BOOLEAN DEFAULT false,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS international_tracks (
    id              SERIAL PRIMARY KEY,
    partner_name    VARCHAR(150) NOT NULL,
    direction_id    INT REFERENCES directions(id),
    responsible_id  INT REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    notes           TEXT,
    task_id         INT REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS task_history (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by  INT NOT NULL REFERENCES users(id),
    old_status  VARCHAR(20),
    new_status  VARCHAR(20),
    comment     TEXT,
    changed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id          SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name   VARCHAR(255),
    file_url    VARCHAR(500),
    uploaded_by INT REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tasks_assignee   ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_direction  ON tasks(direction_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority   ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date   ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
