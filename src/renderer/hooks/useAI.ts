import { useState, useCallback } from 'react';

export function useAI() {
  const [loading, setLoading] = useState(false);

  const explainError = useCallback(
    async (error: string, context: string) => {
      setLoading(true);
      try {
        return await window.void.ai.explain(error, context);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const checkDanger = useCallback(
    async (command: string, server: string) => {
      return window.void.ai.checkDanger(command, server);
    },
    [],
  );

  const getAutocomplete = useCallback(
    async (context: string, history: string[]) => {
      return window.void.ai.autocomplete(context, history);
    },
    [],
  );

  const translateNaturalLanguage = useCallback(
    async (query: string, server: string) => {
      setLoading(true);
      try {
        return await window.void.ai.naturalLanguage(query, server);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    explainError,
    checkDanger,
    getAutocomplete,
    translateNaturalLanguage,
  };
}
