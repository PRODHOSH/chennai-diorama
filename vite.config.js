import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Dev-only "bake" endpoint.
 * The live app fetches OpenStreetMap data from Overpass at runtime. When it runs under
 * `npm run dev` it can also POST the processed snapshot here so that production builds
 * ship an offline copy in /public/data (OSM data © OpenStreetMap contributors, ODbL).
 * It only exists on the local dev server (apply: 'serve') and only writes .json files
 * into public/data.
 */
function bakeSnapshot() {
  return {
    name: 'namma-bake-snapshot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__bake', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        const name = path.basename(req.url || '').replace(/[^a-z0-9_.-]/gi, '');
        if (!name.endsWith('.json')) { res.statusCode = 400; return res.end('json only'); }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const dir = path.resolve('public/data');
          fs.mkdirSync(dir, { recursive: true });
          const buf = Buffer.concat(chunks);
          fs.writeFileSync(path.join(dir, name), buf);
          res.end(`baked ${name} ${buf.length}`);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [bakeSnapshot()],
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
});
