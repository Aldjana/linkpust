import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

await connectDB();

const server = app.listen(env.port, () => {
  console.log(`API LinkPulse en écoute sur http://localhost:${env.port}`);
});

const shutdown = () => {
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
