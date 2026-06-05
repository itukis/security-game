export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ErrorKind = "network" | "auth" | "server";

export function classifyError(err: unknown): ErrorKind {
  if (err instanceof ApiError) {
    return err.status === 401 ? "auth" : "server";
  }
  return "network";
}
