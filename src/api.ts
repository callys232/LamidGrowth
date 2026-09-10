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
export async function api<T>(
  path: string,
  body?: unknown,
  method = 'POST',
  idempotencyKey?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : method,
    credentials: 'same-origin',
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
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error || 'Unable to complete this request.', response.status);
  return data;
}
