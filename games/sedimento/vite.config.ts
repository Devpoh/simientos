import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Hosts permitidos: los túneles de trabajo de OpenHands (para poder jugar desde el navegador del usuario).
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
    allowedHosts: ['.prod-runtime.all-hands.dev'],
  },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
