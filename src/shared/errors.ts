export class HttpError extends Error {
  readonly statusCode: number;
  readonly errors: Record<string, string> | null;

  constructor(message: string, statusCode = 500, errors: Record<string, string> | null = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class EnvValidationError extends Error {
  readonly issues: Record<string, string>;

  constructor(issues: Record<string, string>) {
    super('Invalid environment configuration');
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}
