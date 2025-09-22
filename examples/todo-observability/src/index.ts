import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
const { TelemetryCore } = require('../../../dist/index');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const telemetry = TelemetryCore.fromEnvironment();

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'todoapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    const traceId = await telemetry.startTrace({
      operationName: `${req.method} ${req.path}`,
      startTime: Date.now(),
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.path,
        'user.agent': req.get('User-Agent') || '',
      },
    });

    res.locals.traceId = traceId;
    
    await telemetry.recordMetric({
      name: 'http_requests_total',
      value: 1,
      unit: 'count',
      attributes: {
        method: req.method,
        route: req.path,
      },
    });

    const startTime = Date.now();
    
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        
        await telemetry.recordMetric({
          name: 'http_request_duration_ms',
          value: duration,
          unit: 'milliseconds',
          attributes: {
            method: req.method,
            route: req.path,
            status_code: res.statusCode.toString(),
          },
        });

        if (res.statusCode >= 400) {
          await telemetry.recordMetric({
            name: 'http_errors_total',
            value: 1,
            unit: 'count',
            attributes: {
              method: req.method,
              route: req.path,
              status_code: res.statusCode.toString(),
            },
          });
        }

        await telemetry.endTrace(traceId, {
          'http.status_code': res.statusCode,
          'http.response_size': res.get('Content-Length') || '0',
        });
      } catch (error) {
        console.error('Error in response finish handler:', error);
      }
    });

    next();
  } catch (error) {
    console.error('Error in telemetry middleware:', error);
    next();
  }
});

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    
    await telemetry.recordLog({
      level: 'info',
      message: 'Health check passed',
      attributes: {
        component: 'health_check',
        database_status: 'healthy',
      },
      traceId: res.locals.traceId,
    });

    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      service: 'todo-app'
    });
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Health check failed',
      attributes: {
        component: 'health_check',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      traceId: res.locals.traceId,
    });

    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    const tasks = result.rows;

    await telemetry.recordMetric({
      name: 'tasks_total',
      value: tasks.length,
      unit: 'count',
      attributes: {
        operation: 'list',
      },
    });

    const completedTasks = tasks.filter(task => task.completed).length;
    await telemetry.recordMetric({
      name: 'tasks_completed_total',
      value: completedTasks,
      unit: 'count',
    });

    await telemetry.recordMetric({
      name: 'tasks_pending_total',
      value: tasks.length - completedTasks,
      unit: 'count',
    });

    await telemetry.recordLog({
      level: 'info',
      message: `Retrieved ${tasks.length} tasks`,
      attributes: {
        operation: 'list_tasks',
        task_count: tasks.length,
        completed_count: completedTasks,
      },
      traceId: res.locals.traceId,
    });

    res.json(tasks);
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Failed to retrieve tasks',
      attributes: {
        operation: 'list_tasks',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      traceId: res.locals.traceId,
    });

    res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      await telemetry.recordLog({
        level: 'warn',
        message: 'Task creation failed: missing title',
        attributes: {
          operation: 'create_task',
          validation_error: 'missing_title',
        },
        traceId: res.locals.traceId,
      });

      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const taskId = uuidv4();
    const now = new Date();

    const result = await db.query(
      'INSERT INTO tasks (id, title, description, completed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [taskId, title, description || null, false, now, now]
    );

    const task = result.rows[0];

    await telemetry.recordMetric({
      name: 'tasks_created_total',
      value: 1,
      unit: 'count',
      attributes: {
        operation: 'create',
      },
    });

    await telemetry.recordLog({
      level: 'info',
      message: `Task created: ${task.title}`,
      attributes: {
        operation: 'create_task',
        task_id: task.id,
        task_title: task.title,
      },
      traceId: res.locals.traceId,
    });

    res.status(201).json(task);
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Failed to create task',
      attributes: {
        operation: 'create_task',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      traceId: res.locals.traceId,
    });

    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const result = await db.query(
      'UPDATE tasks SET completed = true, updated_at = $1 WHERE id = $2 RETURNING *',
      [now, id]
    );

    if (result.rows.length === 0) {
      await telemetry.recordLog({
        level: 'warn',
        message: `Task not found for completion: ${id}`,
        attributes: {
          operation: 'complete_task',
          task_id: id,
          result: 'not_found',
        },
        traceId: res.locals.traceId,
      });

      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = result.rows[0];

    await telemetry.recordMetric({
      name: 'tasks_completed_total',
      value: 1,
      unit: 'count',
      attributes: {
        operation: 'complete',
      },
    });

    await telemetry.recordLog({
      level: 'info',
      message: `Task completed: ${task.title}`,
      attributes: {
        operation: 'complete_task',
        task_id: task.id,
        task_title: task.title,
      },
      traceId: res.locals.traceId,
    });

    res.json(task);
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Failed to complete task',
      attributes: {
        operation: 'complete_task',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      traceId: res.locals.traceId,
    });

    res.status(500).json({ error: 'Failed to complete task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await telemetry.recordLog({
        level: 'warn',
        message: `Task not found for deletion: ${id}`,
        attributes: {
          operation: 'delete_task',
          task_id: id,
          result: 'not_found',
        },
        traceId: res.locals.traceId,
      });

      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = result.rows[0];

    await telemetry.recordMetric({
      name: 'tasks_deleted_total',
      value: 1,
      unit: 'count',
      attributes: {
        operation: 'delete',
      },
    });

    await telemetry.recordLog({
      level: 'info',
      message: `Task deleted: ${task.title}`,
      attributes: {
        operation: 'delete_task',
        task_id: task.id,
        task_title: task.title,
      },
      traceId: res.locals.traceId,
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Failed to delete task',
      attributes: {
        operation: 'delete_task',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      traceId: res.locals.traceId,
    });

    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.post('/api/simulate-error/:type', async (req, res) => {
  const { type } = req.params;

  await telemetry.recordLog({
    level: 'warn',
    message: `Simulating error type: ${type}`,
    attributes: {
      operation: 'simulate_error',
      error_type: type,
    },
    traceId: res.locals.traceId,
  });

  switch (type) {
    case 'db':
      try {
        await db.query('SELECT * FROM non_existent_table');
      } catch (error) {
        await telemetry.recordLog({
          level: 'error',
          message: 'Simulated database error',
          attributes: {
            operation: 'simulate_error',
            error_type: 'database',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          traceId: res.locals.traceId,
        });
        res.status(500).json({ error: 'Database error simulated' });
        return;
      }
      break;

    case 'timeout':
      await new Promise(resolve => setTimeout(resolve, 5000));
      res.status(408).json({ error: 'Timeout simulated' });
      return;

    case 'slow':
      const delay = Math.random() * 3000 + 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      res.json({ message: 'Slow operation completed', delay });
      return;

    case '500':
      await telemetry.recordLog({
        level: 'error',
        message: 'Simulated internal server error',
        attributes: {
          operation: 'simulate_error',
          error_type: 'internal_server_error',
        },
        traceId: res.locals.traceId,
      });
      res.status(500).json({ error: 'Internal server error simulated' });
      return;

    default:
      res.status(400).json({ error: 'Unknown error type' });
      return;
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function initializeDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await telemetry.recordLog({
      level: 'info',
      message: 'Database initialized successfully',
      attributes: {
        component: 'database',
        operation: 'initialize',
      },
    });
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Failed to initialize database',
      attributes: {
        component: 'database',
        operation: 'initialize',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

async function startServer() {
  try {
    await telemetry.initialize();
    await initializeDatabase();

    app.listen(port, async () => {
      await telemetry.recordLog({
        level: 'info',
        message: `🌊 Hydropulse To-Do App started on port ${port}`,
        attributes: {
          component: 'server',
          operation: 'start',
          port: port.toString(),
        },
      });

      console.log(`🌊 Hydropulse To-Do App running on http://localhost:${port}`);
      console.log(telemetry.getHydropulseStatus());
    });
  } catch (error) {
    await telemetry.recordLog({
      level: 'error',
      message: 'Failed to start server',
      attributes: {
        component: 'server',
        operation: 'start',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await telemetry.recordLog({
    level: 'info',
    message: 'Received SIGTERM, shutting down gracefully',
    attributes: {
      component: 'server',
      operation: 'shutdown',
    },
  });

  await telemetry.shutdown();
  await db.end();
  process.exit(0);
});

startServer();
