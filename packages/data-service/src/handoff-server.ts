/**
 * createHandoffHttpServer — the transport for the Code <-> Intelligence bridge.
 *
 * This is the LIVE path a caller on the Intelligence side can hit: a small
 * host-agnostic HTTP server (node:http only — NO Electron) that sprinkles the
 * HandoffRunner over a loopback endpoint. An external caller POSTs a
 * HandoffRequest and receives a real HandoffResult back.
 *
 * Endpoints:
 *   GET  /health        -> { ok: true }
 *   POST /run           -> HandoffRequest -> HandoffResult
 *   POST /approval      -> HandoffApprovalReply -> HandoffResult
 *
 * Auth: when `token` is provided, every /run and /approval request must carry
 * `Authorization: Bearer <token>`. /health is always open so a caller can probe
 * liveness without leaking credentials.
 */

import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse, RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HandoffRunner } from './handoff-runner.js';
import type { HandoffRunnerOptions } from './handoff-runner.js';
import { isHandoffApprovalReply, isHandoffRequest } from '@cron-code/contracts';
import type { HandoffApprovalReply, HandoffRequest } from '@cron-code/contracts';

export interface HandoffHttpServerOptions extends HandoffRunnerOptions {
  /** When set, /run and /approval require `Authorization: Bearer <token>`. */
  readonly token?: string;
  readonly port?: number;
  readonly host?: string;
}

export interface HandoffHttpServer {
  readonly baseUrl: string;
  readonly port: number;
  close(): Promise<void>;
}

const MAX_BODY = 4 * 1024 * 1024; // 4MB cap on request bodies

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf-8');
      if (body.length > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const text = await readBody(req);
  return text ? JSON.parse(text) : null;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export function createHandoffHttpServer(options: HandoffHttpServerOptions): Promise<HandoffHttpServer> {
  const runner = new HandoffRunner(options);

  const handler: RequestListener = async (req, res) => {
    const url = req.url ?? '/';

    if (req.method === 'GET' && url === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if ((req.method === 'POST' && url === '/run') || (req.method === 'POST' && url === '/approval')) {
      // Auth gate (when configured).
      if (options.token) {
        const auth = req.headers.authorization ?? '';
        if (auth !== `Bearer ${options.token}`) {
          sendJson(res, 401, { error: 'unauthorized' });
          return;
        }
      }

      try {
        let body: unknown;
        try {
          body = await readJson(req);
        } catch {
          sendJson(res, 400, { error: 'invalid json' });
          return;
        }

        if (url === '/run') {
          if (!isHandoffRequest(body)) {
            sendJson(res, 400, { error: 'invalid handoff request' });
            return;
          }
          const result = await runner.run(body as HandoffRequest);
          sendJson(res, 200, result);
          return;
        }

        if (!isHandoffApprovalReply(body)) {
          sendJson(res, 400, { error: 'invalid approval reply' });
          return;
        }
        const result = await runner.replyToApproval(body as HandoffApprovalReply);
        sendJson(res, 200, result);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendJson(res, 500, { error: message });
        return;
      }
    }

    sendJson(res, 404, { error: 'not found' });
  };

  const server: Server = createServer(handler);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      const port = address.port;
      const baseUrl = `http://${options.host ?? '127.0.0.1'}:${port}`;
      resolve({
        baseUrl,
        port,
        close: () => new Promise<void>((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}
