/** An error whose message is safe to show to the user, with the HTTP status to send. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Sign in to continue.") => new HttpError(401, message);
export const forbidden = (message = "You do not have access to this resource.") =>
  new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
