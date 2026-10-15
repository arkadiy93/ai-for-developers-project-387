import type { components } from '@calendar/api';
import type { ErrorRequestHandler, RequestHandler } from 'express';

type ApiError = components['schemas']['Error'];
type ErrorDetail = components['schemas']['ErrorDetail'];

// The shape of errors thrown by express-openapi-validator and Express's body parser, and by handlers.
export interface HttpError {
  status?: number;
  /**
   * A 404's code when it is more specific than `NOT_FOUND`, for example `EVENT_TYPE_NOT_FOUND`,
   * or a 409's code, for example `SLOT_UNAVAILABLE`.
   */
  code?: string;
  message?: string;
  errors?: ErrorDetail[];
}

// The validator reports body fields as `/body/<field>`; the envelope uses pointers into the body.
function toDetail({ path, message }: ErrorDetail): ErrorDetail {
  return { path: path.replace(/^\/body(?=\/|$)/, '') || '/', message };
}

function toEnvelope(err: HttpError): [number, ApiError] {
  const message = err.message ?? 'Request failed';
  const status = err.status ?? 500;

  if (status === 404) {
    return [404, { code: err.code ?? 'NOT_FOUND', message }];
  }
  if (status === 409 && err.code) {
    return [409, { code: err.code, message }];
  }
  if (status === 405) {
    return [405, { code: 'METHOD_NOT_ALLOWED', message }];
  }
  // Every other client error (bad JSON, too large, wrong media type) is a malformed request.
  if (status >= 400 && status < 500) {
    const body: ApiError = { code: 'VALIDATION_ERROR', message };
    if (err.errors) {
      body.details = err.errors.map(toDetail);
    }
    return [400, body];
  }

  console.error(err);
  return [500, { code: 'INTERNAL', message: 'Internal server error' }];
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next({ status: 404, message: 'not found' } satisfies HttpError);
};

export const errorHandler: ErrorRequestHandler = (err: HttpError, _req, res, _next) => {
  const [status, body] = toEnvelope(err);

  res.status(status).json(body);
};
