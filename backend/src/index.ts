import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import tasksRoutes from './routes/tasks';
import usersRoutes from './routes/users';
import directionsRoutes from './routes/directions';
import reportsRoutes from './routes/reports';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/tasks', tasksRoutes);
app.use('/users', usersRoutes);
app.use('/directions', directionsRoutes);
app.use('/reports', reportsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ data: null, error: 'Маршрут не найден' }));

app.listen(PORT, () => console.log(`MAPAP API running on :${PORT}`));
