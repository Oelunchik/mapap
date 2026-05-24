import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ data: null, error: 'Email и пароль обязательны' });
  }
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password, u.role,
              d.code AS direction_code, d.name_ru AS direction_name
       FROM users u LEFT JOIN directions d ON u.direction_id = d.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ data: null, error: 'Неверный email или пароль' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const { password: _, ...userOut } = user;
    res.json({ data: { token, user: userOut }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role,
              d.code AS direction_code, d.name_ru AS direction_name
       FROM users u LEFT JOIN directions d ON u.direction_id = d.id
       WHERE u.id = $1`,
      [req.user!.id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch {
    res.status(500).json({ data: null, error: 'Ошибка сервера' });
  }
});

export default router;
