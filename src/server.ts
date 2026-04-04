import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const env = getEnv();
const app = createApp({ env });

if (!env.supabaseEnabled) {
  logger.warn('Starting in local mode with Supabase disabled', {
    nodeEnv: env.nodeEnv,
    port: env.port,
  });
}

app.listen(env.port, () => {
  logger.info('Backend server listening', {
    nodeEnv: env.nodeEnv,
    port: env.port,
    supabaseEnabled: env.supabaseEnabled,
  });
});
