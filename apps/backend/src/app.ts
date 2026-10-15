import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import express from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import { bookingsRouter } from './bookings.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { eventTypesRouter } from './event-types.js';
import { createStore } from './store.js';

const apiSpec = createRequire(import.meta.url).resolve('@calendar/api/openapi.yaml');

export interface AppDeps {
  db: DatabaseSync;
  /** The clock. Defaults to the system clock. */
  now?: () => Date;
  /** The built frontend. When set, the app also serves it, with `index.html` for client routes. */
  staticDir?: string;
}

export function createApp({ db, now = () => new Date(), staticDir }: AppDeps) {
  const store = createStore(db);

  const app = express();

  app.use(express.json());
  app.use(
    OpenApiValidator.middleware({
      apiSpec,
      validateRequests: true,
      validateResponses: true,
    }),
  );

  app.use('/api', eventTypesRouter(store, now));
  app.use('/api', bookingsRouter(store, now));

  if (staticDir) {
    app.use(express.static(staticDir));
    // Client-side routes like `/admin` get the SPA; unknown `/api` paths still get the envelope.
    app.get('/{*path}', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  // A documented route with no handler yet still answers with the envelope.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
