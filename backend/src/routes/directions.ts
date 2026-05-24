import { Router, Response } from 'express';
import { pool } from '../config/db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM directions ORDER BY id');
    res.json({ data: result.rows, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/task-types', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM task_types ORDER BY id');
    res.json({ data: result.rows, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/:code/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.priority, t.status, t.due_date, t.is_urgent,
              u.full_name AS assignee_name, tt.name_ru AS task_type_name
       FROM tasks t
       JOIN directions d ON t.direction_id = d.id
       JOIN users u ON t.assignee_id = u.id
       JOIN task_types tt ON t.task_type_id = tt.id
       WHERE d.code = $1
       ORDER BY t.priority, t.due_date NULLS LAST`,
      [req.params.code]
    );
    res.json({ data: result.rows, meta: { total: result.rowCount }, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

export default router;
