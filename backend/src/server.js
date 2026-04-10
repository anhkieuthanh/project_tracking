import { createApp } from './app.js';
import { config } from './config.js';
import { initDb } from './db.js';

async function bootstrap() {
  await initDb();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Backend running at http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
