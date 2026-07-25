/**
 * The axios interceptor runs outside React, so the current bearer token
 * lives here as plain module state that the auth provider keeps in sync.
 */
let token: string | null = null;

export function getAuthToken(): string | null {
  return token;
}

export function setAuthToken(next: string | null): void {
  token = next;
}
