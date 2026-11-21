"use client";

import { useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

const IDB_CACHE_KEY = "app-hechizos-query-cache-v1";

function createIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(IDB_CACHE_KEY, client);
      } catch {
        // Ignore private browsing / quota errors
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(IDB_CACHE_KEY);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(IDB_CACHE_KEY);
      } catch {
        // Ignore
      }
    },
  };
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 1000 * 60 * 60 * 24, // 24 hours persistent cache
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      })
  );

  const [persister] = useState(() => createIdbPersister());

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
      }}
    >
      {children}
      <Toaster
        theme={resolved}
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--bg-surface)",
            color: "var(--fg-primary)",
            border: "1px solid var(--line-strong)",
            borderRadius: "14px",
          },
        }}
      />
    </PersistQueryClientProvider>
  );
}
