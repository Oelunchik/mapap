-- =============================================
-- MAPAP — Начальные данные (52 задачи из PRD)
-- =============================================

-- Направления
INSERT INTO directions (code, name_ru) VALUES
  ('general', 'Общее'),
  ('avia',    'Авиация'),
  ('rail',    'Железнодорожный транспорт'),
  ('auto',    'Автотранспорт'),
  ('drone',   'Беспилотные системы')
ON CONFLICT (code) DO NOTHING;

-- Типы задач
INSERT INTO task_types (code, name_ru) VALUES
  ('project',   'Проект'),
  ('analytics', 'Аналитика'),
  ('research',  'Исследование'),
  ('report',    'Отчёт'),
  ('meeting',   'Встреча'),
  ('note',      'Записка'),
  ('order',     'Приказ'),
  ('brief',     'Справка'),
  ('session',   'Совещание')
ON CONFLICT (code) DO NOTHING;

-- Пользователи (пароль: mapap2026 → bcrypt)
INSERT INTO users (full_name, email, password, role, direction_id) VALUES
  ('Алуа',  'alua@mapap.kz',  '$2b$10$Xz7v.1b9YKNwOGIbpB/UaOhYE3TjbEp3v/8fFzL2lQwKpHOMNQsXi', 'head',    (SELECT id FROM directions WHERE code='general')),
  ('Арай',  'aray@mapap.kz',  '$2b$10$Xz7v.1b9YKNwOGIbpB/UaOhYE3TjbEp3v/8fFzL2lQwKpHOMNQsXi', 'analyst', (SELECT id FROM directions WHERE code='avia')),
  ('Диана', 'diana@mapap.kz', '$2b$10$Xz7v.1b9YKNwOGIbpB/UaOhYE3TjbEp3v/8fFzL2lQwKpHOMNQsXi', 'analyst', (SELECT id FROM directions WHERE code='rail')),
  ('Ерхан', 'erkhan@mapap.kz','$2b$10$Xz7v.1b9YKNwOGIbpB/UaOhYE3TjbEp3v/8fFzL2lQwKpHOMNQsXi', 'analyst', (SELECT id FROM directions WHERE code='auto')),
  ('Асыл',  'asyl@mapap.kz',  '$2b$10$Xz7v.1b9YKNwOGIbpB/UaOhYE3TjbEp3v/8fFzL2lQwKpHOMNQsXi', 'analyst', (SELECT id FROM directions WHERE code='drone'))
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- ЗАДАЧИ АЛУА (23 шт)
-- ============================================================
DO $$
DECLARE
  u_alua  INT := (SELECT id FROM users WHERE email='alua@mapap.kz');
  u_aray  INT := (SELECT id FROM users WHERE email='aray@mapap.kz');
  u_diana INT := (SELECT id FROM users WHERE email='diana@mapap.kz');
  u_erkhan INT := (SELECT id FROM users WHERE email='erkhan@mapap.kz');
  u_asyl  INT := (SELECT id FROM users WHERE email='asyl@mapap.kz');

  d_general INT := (SELECT id FROM directions WHERE code='general');
  d_avia    INT := (SELECT id FROM directions WHERE code='avia');
  d_rail    INT := (SELECT id FROM directions WHERE code='rail');
  d_auto    INT := (SELECT id FROM directions WHERE code='auto');
  d_drone   INT := (SELECT id FROM directions WHERE code='drone');

  t_project   INT := (SELECT id FROM task_types WHERE code='project');
  t_analytics INT := (SELECT id FROM task_types WHERE code='analytics');
  t_research  INT := (SELECT id FROM task_types WHERE code='research');
  t_report    INT := (SELECT id FROM task_types WHERE code='report');
  t_meeting   INT := (SELECT id FROM task_types WHERE code='meeting');
  t_note      INT := (SELECT id FROM task_types WHERE code='note');
  t_order     INT := (SELECT id FROM task_types WHERE code='order');
  t_brief     INT := (SELECT id FROM task_types WHERE code='brief');
  t_session   INT := (SELECT id FROM task_types WHERE code='session');

  tmtm_id INT;
  transit_id INT;
  cargo_id INT;
BEGIN

-- === АЛУА — Высокий приоритет (1) ===
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('TRIP', u_alua, d_general, t_project, 1, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Smart Cargo', u_alua, d_general, t_project, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('China Border master plan', 'Приоритет — подчёркнуто', u_alua, d_general, t_research, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('TMTM — море + Rail Digital', 'Два поднаправления: море и Rail Digital', u_alua, d_rail, t_project, 1, 'new', u_alua)
RETURNING id INTO tmtm_id;

-- Подзадачи TMTM
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('TMTM — море', u_alua, d_rail, t_project, 1, 'new', tmtm_id, u_alua);
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('TMTM — Rail Digital', u_alua, d_rail, t_project, 1, 'new', tmtm_id, u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Transit КПИ план — 55 млн тонн', 'Rail / auto / air — КПИ по трём направлениям', u_alua, d_general, t_analytics, 1, 'new', u_alua)
RETURNING id INTO transit_id;

-- Подзадачи Transit KPI
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Transit KPI — Rail', u_alua, d_rail, t_analytics, 1, 'new', transit_id, u_alua);
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Transit KPI — Auto', u_alua, d_auto, t_analytics, 1, 'new', transit_id, u_alua);
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Transit KPI — Air', u_alua, d_avia, t_analytics, 1, 'new', transit_id, u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Cargo Terminal — Астана, Алматы, Актобе, Шымкент', '4 города', u_alua, d_avia, t_project, 1, 'new', u_alua)
RETURNING id INTO cargo_id;

-- Подзадачи Cargo Terminal
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Cargo Terminal — Астана', u_alua, d_avia, t_project, 1, 'new', cargo_id, u_alua);
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Cargo Terminal — Алматы', u_alua, d_avia, t_project, 1, 'new', cargo_id, u_alua);
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Cargo Terminal — Актобе', u_alua, d_avia, t_project, 1, 'new', cargo_id, u_alua);
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, parent_task_id, created_by)
VALUES ('Cargo Terminal — Шымкент', u_alua, d_avia, t_project, 1, 'new', cargo_id, u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('UAE — DPWorld, Jebel Ali', u_alua, d_general, t_meeting, 1, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, due_date, created_by)
VALUES ('Квартальный отчёт по направлениям', u_alua, d_general, t_report, 1, 'in_progress', '2026-06-01', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, due_date, created_by)
VALUES ('Встреча с Министерством транспорта', u_alua, d_general, t_meeting, 1, 'new', '2026-05-30', u_alua);

-- === АЛУА — Средний приоритет (2) ===
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('FTZ (Free Trade Zone)', u_alua, d_general, t_analytics, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('AI transport & logistics', u_alua, d_general, t_project, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('TransInfo', u_alua, d_general, t_project, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Skyhub УТО', u_alua, d_avia, t_project, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Air cargo Airlines — Турлоу, Қорғауыл', u_alua, d_avia, t_project, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Uzколейка', u_alua, d_rail, t_research, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('KPI customs', u_alua, d_general, t_analytics, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Inditex', u_alua, d_general, t_meeting, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Drone projects', u_alua, d_drone, t_project, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Airfuel — хранение и услуги', u_alua, d_avia, t_analytics, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Round Table', u_alua, d_general, t_meeting, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Global Gateway', u_alua, d_general, t_project, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, due_date, created_by)
VALUES ('Записка: приоритеты офиса на Q3', u_alua, d_general, t_note, 2, 'new', '2026-06-10', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Совещание по беспилотникам и авиа', u_alua, d_general, t_session, 2, 'in_progress', u_alua);

-- ============================================================
-- ЗАДАЧИ АРАЙ (13 шт)
-- ============================================================
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Аналитика за квартал', u_aray, d_avia, t_analytics, 1, 'in_progress', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Структура по ТЗК и нефтехранилищам — Рахман', 'Поручение от Рахмана', u_aray, d_avia, t_research, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, is_urgent, created_by)
VALUES ('Дорожная карта авиа', 'Сдать до вечера — срочно!', u_aray, d_avia, t_report, 1, 'in_progress', true, u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Авиа-хабы: подписать договор', u_aray, d_avia, t_note, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, is_urgent, created_by)
VALUES ('Справка АП по интеграции E-Freight', 'Срочная', u_aray, d_avia, t_brief, 1, 'new', true, u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Гос закупки — доходы от нерезидентов', 'Взять технику без гос закупок', u_aray, d_avia, t_note, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('IATA — консалтинг тим, уточнить дату', 'Когда приедут?', u_aray, d_avia, t_meeting, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('IATA — Касс вернулся, согласовать', u_aray, d_avia, t_meeting, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Авиа-хабы: развитие и СЭЗ', u_aray, d_avia, t_analytics, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Блок развития авиа — кто может летать через Россию', u_aray, d_avia, t_research, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('E-Freight: интеграция с КЕДЕН', u_aray, d_avia, t_analytics, 2, 'in_progress', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('5 категория полётов', u_aray, d_avia, t_analytics, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Катар Эйрлайнс', u_aray, d_avia, t_note, 2, 'new', u_alua);

-- ============================================================
-- ЗАДАЧИ ДИАНЫ (8 шт)
-- ============================================================
INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Сквозное планирование ж/д перевозок', 'Главный приоритет направления. Интеграция с соседними системами', u_diana, d_rail, t_research, 1, 'in_progress', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Разделение КТЖ — нужно или нет, что с IPO', 'Проработать сценарии разделения и перспективы IPO', u_diana, d_rail, t_analytics, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Приказ МПС по досмотрам — уменьшить количество', 'Цель: сократить досмотры, ускорить грузопоток', u_diana, d_rail, t_order, 1, 'in_progress', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Увеличение грузопотока на ж/д', 'Связано с сокращением досмотров', u_diana, d_rail, t_analytics, 1, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Приоритезация КТЖ — планирование', u_diana, d_rail, t_note, 2, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Транспортные коридоры — 6 коридоров', 'Анализ по 6 международным коридорам', u_diana, d_rail, t_research, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Цифровые перевозки', u_diana, d_rail, t_analytics, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Пропускная способность ж/д', u_diana, d_rail, t_research, 2, 'new', u_alua);

-- ============================================================
-- ЗАДАЧИ ЕРХАНА (6 шт)
-- ============================================================
INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Методология — дата предоставления', 'Уточнить срок сдачи методологии', u_erkhan, d_auto, t_note, 1, 'in_progress', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('ИБР — Динмухамед, комитет авто', 'Согласовать с Динмухамедом по комитету авто', u_erkhan, d_auto, t_meeting, 1, 'new', u_alua);

INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('IRU — окончательная записка к следующей встрече', 'Подготовить до следующего совещания', u_erkhan, d_auto, t_note, 1, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('IRU — организованная экосистема перевозчиков', u_erkhan, d_auto, t_analytics, 2, 'in_progress', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('IRU — Указ РУЗ', u_erkhan, d_auto, t_research, 2, 'new', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Совет по транспорту', u_erkhan, d_auto, t_session, 2, 'new', u_alua);

-- ============================================================
-- ЗАДАЧИ АСЫЛ (2 шт)
-- ============================================================
INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, due_date, created_by)
VALUES ('Регулирование беспилотной авиации', u_asyl, d_drone, t_analytics, 1, 'in_progress', '2026-06-08', u_alua);

INSERT INTO tasks (title, assignee_id, direction_id, task_type_id, priority, status, created_by)
VALUES ('Дорожная карта беспилотников', u_asyl, d_drone, t_report, 2, 'new', u_alua);

END $$;

-- ============================================================
-- МЕЖДУНАРОДНЫЕ ТРЕКИ (§9 PRD)
-- ============================================================
INSERT INTO international_tracks (partner_name, direction_id, responsible_id, status) VALUES
  ('IATA',                       (SELECT id FROM directions WHERE code='avia'),    (SELECT id FROM users WHERE email='aray@mapap.kz'),   'in_progress'),
  ('IRU',                        (SELECT id FROM directions WHERE code='auto'),    (SELECT id FROM users WHERE email='erkhan@mapap.kz'), 'in_progress'),
  ('UAE — DPWorld, Jebel Ali',   (SELECT id FROM directions WHERE code='general'), (SELECT id FROM users WHERE email='alua@mapap.kz'),   'new'),
  ('Global Gateway',             (SELECT id FROM directions WHERE code='general'), (SELECT id FROM users WHERE email='alua@mapap.kz'),   'new'),
  ('China Border master plan',   (SELECT id FROM directions WHERE code='general'), (SELECT id FROM users WHERE email='alua@mapap.kz'),   'new'),
  ('Inditex',                    (SELECT id FROM directions WHERE code='general'), (SELECT id FROM users WHERE email='alua@mapap.kz'),   'new'),
  ('Катар Эйрлайнс',             (SELECT id FROM directions WHERE code='avia'),    (SELECT id FROM users WHERE email='aray@mapap.kz'),   'new'),
  ('E-Freight / КЕДЕН',          (SELECT id FROM directions WHERE code='avia'),    (SELECT id FROM users WHERE email='aray@mapap.kz'),   'in_progress');
