import Constants from 'expo-constants';

/**
 * `localhost` only reaches the API from a simulator on the same machine. In
 * Expo Go on a phone it has to be the dev machine's LAN address, which Expo
 * already knows as `hostUri`, so derive the host from it and keep the API
 * port. An explicit non-localhost `extra.apiUrl` always wins.
 */
const API_PORT = 3000;

function resolveBaseUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (configured && !configured.includes('localhost')) return configured;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${API_PORT}`;
  return configured ?? `http://localhost:${API_PORT}`;
}

export const BASE_URL = resolveBaseUrl();
