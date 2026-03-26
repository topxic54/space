import { defineConfig, type ViteDevServer, type PreviewServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// ============================================================
// API 插件 - 动态加载 server/api.ts（不使用静态 import）
// ============================================================

// Hono -> Connect 适配器
function honoAdapter(app: { fetch(request: Request): Response | Promise<Response> }) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      let body: BodyInit | undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);
        body = Buffer.concat(chunks);
      }

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }

      const response = await app.fetch(new Request(url.toString(), {
        method: req.method,
        headers,
        body,
      }));

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      const responseBody = await response.arrayBuffer();
      res.end(Buffer.from(responseBody));
    } catch {
      next();
    }
  };
}

function apiPlugin() {
  const base = process.env.VITE_BASE || '/';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const apiPath = `${normalizedBase}/api`;
  let outDir = 'dist';

  return {
    name: 'api-plugin',

    // 捕获实际 outDir（deploy 时可能通过 --outDir 指定到 deploy/version-X/dist/）
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },

    // Dev: ssrLoadModule 动态加载，支持 HMR + ../lib/ 路径解析
    configureServer(server: ViteDevServer) {
      server.middlewares.use(apiPath, async (req, res, next) => {
        try {
          const { default: api } = await server.ssrLoadModule('./server/api');
          await honoAdapter(api)(req, res, next);
        } catch { next(); }
      });
    },

    // Build 后：esbuild 单独编译 server 代码到实际 outDir
    async closeBundle() {
      const esbuild = await import('esbuild');
      const absOutDir = resolve(process.cwd(), outDir);
      await esbuild.build({
        entryPoints: ['server/api.ts'],
        bundle: true,
        platform: 'node',
        format: 'esm',
        outfile: resolve(absOutDir, '_server/api.mjs'),
        packages: 'external',
        alias: { '@': resolve(process.cwd(), 'src') },
      });
    },

    // Preview: 加载预编译的 server bundle
    configurePreviewServer(server: PreviewServer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cachedHandler: any;
      server.middlewares.use(apiPath, async (req, res, next) => {
        try {
          if (!cachedHandler) {
            const entry = resolve(process.cwd(), outDir, '_server/api.mjs');
            const { default: api } = await import(entry);
            cachedHandler = honoAdapter(api);
          }
          await cachedHandler(req, res, next);
        } catch { next(); }
      });
    },
  };
}

// ============================================================
// Vite 配置
// ============================================================
export default defineConfig(({ mode }) => {
  const port = parseInt(process.env.PORT || '3100', 10);
  const base = process.env.VITE_BASE || '/';

  return {
    base,
    plugins: [react(), tailwindcss(), apiPlugin()],
    server: {
      port,
      strictPort: true,
      cors: true,
      hmr: false,
    },
    preview: {
      port,
      strictPort: true,
      cors: true,
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
    },
  };
});
