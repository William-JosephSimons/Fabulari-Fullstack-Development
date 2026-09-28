import { defineConfig } from 'cypress';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    setupNodeEvents(on, config) {
      on('task', {
        seedE2eDatabase() {
          const seedScript = resolve(config.projectRoot, '..', 'server', 'seed.js');

          // Run the same seed command against the separate E2E database before each test.
          execFileSync(process.execPath, [seedScript, '--e2e']);
          return null;
        },
      });
    },
  },
});
