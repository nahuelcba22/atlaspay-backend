// Error with an HTTP status code, meant to be mapped by the error handler.
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
    // Keeps `instanceof` working regardless of the compilation target.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}