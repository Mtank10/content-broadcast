import express, { Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import authRoutes from './routes/auth.routes';
import contentRoutes from './routes/content.routes';
import { errorHandler, notFound } from './middlewares/index';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Content Broadcasting  is running.',
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRoutes);
app.use('/content', contentRoutes);


app.use(notFound);
app.use(errorHandler);

export default app;
