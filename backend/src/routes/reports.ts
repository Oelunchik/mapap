import { Router, Response } from 'express';
import { pool } from '../config/db';
import { requireAuth, requireHead, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        COUNT(t.id)                                       AS total,
        COUNT(t.id) FILTER (WHERE t.priority = 1)        AS high_priority,
        COUNT(t.id) FILTER (WHERE t.priority = 2)        AS medium_priority,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress,
        COUNT(t.id) FILTER (WHERE t.status = 'done')     AS done
      FROM users u
      LEFT JOIN tasks t ON t.assignee_id = u.id
      WHERE u.is_active = true
      GROUP BY u.id, u.full_name
      ORDER BY u.id
    `);
    res.json({ data: result.rows, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/overdue', async (req: AuthRequest, res: Response) => {
  const conditions: string[] = ["t.due_date < CURRENT_DATE", "t.status NOT IN ('done')"];
  const params: unknown[] = [];
  if (req.user!.role !== 'head') {
    params.push(req.user!.id);
    conditions.push(`t.assignee_id = $${params.length}`);
  }
  const where = 'WHERE ' + conditions.join(' AND ');
  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.priority, t.status, t.due_date,
              u.full_name AS assignee_name, d.name_ru AS direction_name
       FROM tasks t
       JOIN users u ON t.assignee_id = u.id
       JOIN directions d ON t.direction_id = d.id
       ${where}
       ORDER BY t.due_date`,
      params
    );
    res.json({ data: result.rows, meta: { total: result.rowCount }, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/quarterly', requireHead, async (_req: AuthRequest, res: Response) => {
  try {
    const [summary, byDirection, internationalTracks] = await Promise.all([
      pool.query(`
        SELECT
          u.full_name,
          COUNT(t.id) AS total,
          COUNT(t.id) FILTER (WHERE t.priority = 1) AS high_priority,
          COUNT(t.id) FILTER (WHERE t.priority = 2) AS medium_priority,
          COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress,
          COUNT(t.id) FILTER (WHERE t.status = 'done') AS done
        FROM users u LEFT JOIN tasks t ON t.assignee_id = u.id
        WHERE u.is_active = true
        GROUP BY u.id, u.full_name ORDER BY u.id
      `),
      pool.query(`
        SELECT
          d.name_ru AS direction,
          COUNT(t.id) AS total,
          COUNT(t.id) FILTER (WHERE t.status = 'done') AS done,
          COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress,
          COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'done') AS overdue
        FROM directions d LEFT JOIN tasks t ON t.direction_id = d.id
        GROUP BY d.id, d.name_ru ORDER BY d.id
      `),
      pool.query(`
        SELECT it.partner_name, d.name_ru AS direction, u.full_name AS responsible, it.status
        FROM international_tracks it
        JOIN directions d ON it.direction_id = d.id
        JOIN users u ON it.responsible_id = u.id
        ORDER BY it.id
      `),
    ]);
    res.json({
      data: {
        generated_at: new Date().toISOString(),
        summary: summary.rows,
        by_direction: byDirection.rows,
        international_tracks: internationalTracks.rows,
      },
      error: null,
    });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/international-tracks', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT it.id, it.partner_name, it.status, it.notes,
             d.code AS direction_code, d.name_ru AS direction_name,
             u.full_name AS responsible_name
      FROM international_tracks it
      JOIN directions d ON it.direction_id = d.id
      JOIN users u ON it.responsible_id = u.id
      ORDER BY it.id
    `);
    res.json({ data: result.rows, error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.patch('/international-tracks/:id', requireHead, async (req: AuthRequest, res: Response) => {
  const { status, notes } = req.body;
  try {
    await pool.query(
      'UPDATE international_tracks SET status=COALESCE($1,status), notes=COALESCE($2,notes) WHERE id=$3',
      [status, notes, req.params.id]
    );
    const result = await pool.query(
      `SELECT it.id, it.partner_name, it.status, it.notes,
              d.name_ru AS direction_name, u.full_name AS responsible_name
       FROM international_tracks it
       JOIN directions d ON it.direction_id = d.id
       JOIN users u ON it.responsible_id = u.id
       WHERE it.id = $1`,
      [req.params.id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

export default router;
