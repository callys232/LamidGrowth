export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let workspaceScope: string | undefined;
export function setWorkspaceScope(id: string) {
  workspaceScope = id;
}
// Empty (default) means the API is same-origin — built into this same server, as today. Set to
// the backend's origin (e.g. https://api.lamidgrowth.com, no trailing slash) only when the
// frontend is deployed separately from the backend (e.g. Vercel + a standalone API host).
const apiBase = import.meta.env?.VITE_API_BASE_URL || '';

/** A replacement for the network: given the request, resolve the parsed JSON or throw ApiError.
 * The public demo sets one so workspace operations run on sample data. Verified access,
 * progress synchronization, diagnostics and engine calculation use the dedicated demo API. */
export type ApiTransport = (request: {
  path: string;
  method: string;
  body?: unknown;
}) => Promise<unknown>;
let transport: ApiTransport | null = null;
export function setApiTransport(next: ApiTransport | null) {
  transport = next;
}

export async function api<T>(
  path: string,
  body?: unknown,
  method = 'POST',
  idempotencyKey?: string,
): Promise<T> {
  if (transport)
    return (await transport({ path, method: body === undefined ? 'GET' : method, body })) as T;
  return networkApi<T>(path, body, method, idempotencyKey);
}

/** Always reaches the server, including when workspace requests use the demo sandbox. */
export async function networkApi<T>(
  path: string,
  body?: unknown,
  method = 'POST',
  idempotencyKey?: string,
): Promise<T> {
  const response = await fetch(`${apiBase}/api${path}`, {
    method: body === undefined ? 'GET' : method,
    credentials: apiBase ? 'include' : 'same-origin',
    headers:
      body === undefined
        ? {}
        : {
            'Content-Type': 'application/json',
            ...(workspaceScope ? { 'X-Workspace-Id': workspaceScope } : {}),
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: { error?: string } & Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The server sent an unexpected response. Please try again.',
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(data.error || 'Unable to complete this request.', response.status);
  return data as T;
}
