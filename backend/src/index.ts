/**
 * Barrel re-export for programmatic / integration-test usage.
 *
 * Importing `app` from here gives access to the configured Express application
 * without triggering the HTTP server startup that occurs in `server.ts`.
 * Use `src/server.ts` (or `npm run dev` / `npm start`) to launch the server.
 */
export { app } from './app';
