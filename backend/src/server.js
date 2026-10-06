import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { startScheduler } from './jobs/scheduler.js';
import fs from 'fs';

fs.mkdirSync(env.uploadDir, { recursive: true });

connectDB()
  .then(() => {
    startScheduler();
    app.listen(env.port, () => console.log(`ExpenseFlow API listening on port ${env.port} (${env.nodeEnv})`));
  })
  .catch((err) => { console.error('Failed to start server:', err.message); process.exit(1); });

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));