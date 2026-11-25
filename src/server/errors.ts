export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "NOT_FOUND", "Not found.");

export const isUniqueClash = (error: unknown) => (error as { code?: string } | null)?.code === "P2002";
