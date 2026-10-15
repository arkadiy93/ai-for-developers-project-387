import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

let staticDir: string;

beforeAll(() => {
  staticDir = mkdtempSync(join(tmpdir(), 'calendar-static-'));
  writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>Calendar</title>');
  writeFileSync(join(staticDir, 'app.js'), 'console.log("app");');
});

function testApp(dir?: string) {
  return createApp({ db: new DatabaseSync(':memory:'), staticDir: dir });
}

describe('built frontend', () => {
  it('serves index.html at the root', async () => {
    const res = await request(testApp(staticDir)).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Calendar</title>');
  });

  it('serves index.html for a client route', async () => {
    const res = await request(testApp(staticDir)).get('/admin');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('serves an asset', async () => {
    const res = await request(testApp(staticDir)).get('/app.js');

    expect(res.status).toBe(200);
    expect(res.text).toContain('console.log');
  });

  it('still serves the API', async () => {
    const res = await request(testApp(staticDir)).get('/api/event-types');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('keeps the JSON 404 for an unknown /api path', async () => {
    const res = await request(testApp(staticDir)).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('serves nothing outside /api without a staticDir', async () => {
    const res = await request(testApp()).get('/');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });
});
