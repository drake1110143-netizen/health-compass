import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { sendSuccess } from './utils/http.js';

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => sendSuccess(res, { status: 'ok' }));
app.use('/api', routes);

app.use(errorMiddleware);

export default app;
