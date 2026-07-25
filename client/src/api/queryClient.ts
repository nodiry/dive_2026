import { QueryClient } from '@tanstack/react-query';

/**
 * A module-level singleton (not created inside main.tsx) so non-React code
 * — the auth store's logout/setAuth actions — can clear per-user query
 * caches (saved housing) without needing a QueryClientProvider context.
 */
export const queryClient = new QueryClient();
