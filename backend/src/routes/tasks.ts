import { Router, Response } from 'express';
import { pool } from '../config/db';
import { requireAuth, requireHead, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const TASK_SELECT = `
  SELECT t.id, t.title, t.description, t.priority, t.status,
         t.due_date, t.is_urgent, t.parent_task_id,
         t.created_at, t.updated_at,
         u.id AS assignee_id, u.full_name AS assignee_name,
         d.id AS direction_id, d.code AS direction_code, d.name_ru AS direction_name,
         tt.id AS task_type_id, tt.code AS task_type_code, tt.name_ru AS task_type_name
  FROM tasks t
  JOIN users u ON t.assignee_id = u.id
  JOIN directions d ON t.direction_id = d.id
  JOIN task_types tt ON t.task_type_id = tt.id
`;

router.get('/', async (req: AuthRequest, res: Response) => {
  const { assignee, direction, status, priority, due_from, due_to, parent_only } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.user!.role !== 'head') {
    params.push(req.user!.id);
    conditions.push(`t.assignee_id = $${params.length}`);
  } else if (assignee) {
    params.push(Number(assignee));
    conditions.push(`t.assignee_id = $${params.length}`);
  }
  if (direction) { params.push(direction); conditions.push(`d.code = $${params.length}`); }
  if (status)    { params.push(status);    conditions.push(`t.status = $${params.length}`); }
  if (priority)  { params.push(Number(priority)); conditions.push(`t.priority = $${params.length}`); }
  if (due_from)  { params.push(due_from);  conditions.push(`t.due_date >= $${params.length}`); }
  if (due_to)    { params.push(due_to);    conditions.push(`t.due_date <= $${params.length}`); }
  if (parent_only === 'true') conditions.push('t.parent_task_id IS NULL');

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const result = await pool.query(
      `${TASK_SELECT} ${where} ORDER BY t.priority, t.due_date NULLS LAST, t.created_at DESC`,
      params
    );
    res.json({ data: result.rows, meta: { total: result.rowCount }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ data: null, error: 'Задача не найдена' });
    const task = result.rows[0];
    if (req.user!.role !== 'head' && task.assignee_id !== req.user!.id) {
      return res.status(403).json({ data: null, error: 'Доступ запрещён' });
    }

    const [history, subtasks, attachments] = await Promise.all([
      pool.query(
        `SELECT th.*, u.full_name AS changed_by_name
         FROM task_history th JOIN users u ON th.changed_by = u.id
         WHERE th.task_id = $1 ORDER BY th.changed_at DESC`,
        [req.params.id]
      ),
      pool.query(`${TASK_SELECT} WHERE t.parent_task_id = $1 ORDER BY t.priority`, [req.params.id]),
      pool.query(
        `SELECT ta.*, u.full_name AS uploaded_by_name
         FROM task_attachments ta LEFT JOIN users u ON ta.uploaded_by = u.id
         WHERE ta.task_id = $1 ORDER BY ta.uploaded_at DESC`,
        [req.params.id]
      ),
    ]);

    res.json({
      data: { ...task, history: history.rows, subtasks: subtasks.rows, attachments: attachments.rows },
      error: null,
    });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { title, description, assignee_id, direction_id, task_type_id, priority, status, due_date, parent_task_id, is_urgent } = req.body;
  if (!title || !direction_id || !task_type_id) {
    return res.status(400).json({ data: null, error: 'Обязательные поля: title, direction_id, task_type_id' });
  }
  const finalAssignee = req.user!.role === 'head' ? (assignee_id || req.user!.id) : req.user!.id;
  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, assignee_id, direction_id, task_type_id, priority, status, due_date, parent_task_id, is_urgent, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [title, description, finalAssignee, direction_id, task_type_id, priority || 2, status || 'new', due_date || null, parent_task_id || null, is_urgent || false, req.user!.id]
    );
    const task = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [result.rows[0].id]);
    res.status(201).json({ data: task.rows[0], error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { title, description, direction_id, task_type_id, priority, due_date, is_urgent, assignee_id } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ data: null, error: 'Задача не найдена' });
    if (req.user!.role !== 'head' && existing.rows[0].assignee_id !== req.user!.id) {
      return res.status(403).json({ data: null, error: 'Доступ запрещён' });
    }
    const t = existing.rows[0];
    await pool.query(
      `UPDATE tasks SET title=$1, description=$2, direction_id=$3, task_type_id=$4,
       priority=$5, due_date=$6, is_urgent=$7, assignee_id=$8
       WHERE id = $9`,
      [
        title ?? t.title, description ?? t.description,
        direction_id ?? t.direction_id, task_type_id ?? t.task_type_id,
        priority ?? t.priority, due_date ?? t.due_date,
        is_urgent ?? t.is_urgent,
        (req.user!.role === 'head' ? (assignee_id ?? t.assignee_id) : t.assignee_id),
        req.params.id,
      ]
    );
    const task = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json({ data: task.rows[0], error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status, comment } = req.body;
  const VALID = ['new', 'in_progress', 'review', 'done', 'blocked'];
  if (!VALID.includes(status)) {
    return res.status(400).json({ data: null, error: 'Недопустимый статус' });
  }
  if (status === 'done' && req.user!.role !== 'head') {
    return res.status(403).json({ data: null, error: 'Только руководитель может закрывать задачи' });
  }
  if (status === 'blocked' && !comment) {
    return res.status(400).json({ data: null, error: 'Комментарий обязателен при блокировке' });
  }
  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ data: null, error: 'Задача не найдена' });
    const old_status = existing.rows[0].status;
    await pool.query('UPDATE tasks SET status=$1 WHERE id=$2', [status, req.params.id]);
    await pool.query(
      'INSERT INTO task_history (task_id, changed_by, old_status, new_status, comment) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, req.user!.id, old_status, status, comment || null]
    );
    const task = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [req.params.id]);
    res.json({ data: task.rows[0], error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.delete('/:id', requireHead, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ data: null, error: 'Задача не найдена' });
    res.json({ data: { id: Number(req.params.id) }, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT th.*, u.full_name AS changed_by_name
       FROM task_history th JOIN users u ON th.changed_by = u.id
       WHERE th.task_id = $1 ORDER BY th.changed_at DESC`,
      [req.params.id]
    );
    res.json({ data: result.rows, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

export default router;
