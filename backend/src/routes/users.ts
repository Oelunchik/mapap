import { Router, Response } from 'express';
import { pool } from '../config/db';
import { requireAuth, requireHead, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.is_active,
              d.code AS direction_code, d.name_ru AS direction_name
       FROM users u LEFT JOIN directions d ON u.direction_id = d.id
       WHERE u.is_active = true ORDER BY u.id`
    );
    res.json({ data: result.rows, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/:id/tasks', async (req: AuthRequest, res: Response) => {
  const targetId = Number(req.params.id);
  if (req.user!.role !== 'head' && req.user!.id !== targetId) {
    return res.status(403).json({ data: null, error: 'Доступ запрещён' });
  }
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.priority, t.status, t.due_date, t.is_urgent,
              d.name_ru AS direction_name, tt.name_ru AS task_type_name
       FROM tasks t
       JOIN directions d ON t.direction_id = d.id
       JOIN task_types tt ON t.task_type_id = tt.id
       WHERE t.assignee_id = $1
       ORDER BY t.priority, t.due_date NULLS LAST`,
      [targetId]
    );
    res.json({ data: result.rows, meta: { total: result.rowCount }, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

export default router;
