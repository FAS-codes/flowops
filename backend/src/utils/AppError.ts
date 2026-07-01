/**
 * Operational error with an attached HTTP status code. Anything thrown as an
 * AppError is treated as a known, client-safe failure by the error middleware;
 * anything else is treated as an unexpected 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(msg = 'Bad request') {
    return new AppError(400, msg);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new AppError(401, msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new AppError(403, msg);
  }
  static notFound(msg = 'Not found') {
    return new AppError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new AppError(409, msg);
  }
}
