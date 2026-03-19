import { useEffect, useRef, useCallback } from "react";
import type { UseFormReturn, FieldValues } from "react-hook-form";

const STORAGE_PREFIX = "mx-draft:";

/**
 * Persists react-hook-form values to localStorage so drafts survive
 * navigation and page refresh.
 *
 * Restores saved values via `form.reset()` in a useEffect (after hydration)
 * to avoid SSR/client mismatch. Call `clearDraft()` on successful submit
 * or cancel.
 */
export function useFormPersistence<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  enabled = true,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const storageKey = STORAGE_PREFIX + key;

  // Restore saved draft after hydration
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as T;
        form.reset(saved);
      }
    } catch {
      // corrupt or unavailable — ignore
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch all fields and debounce-save to localStorage
  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((values) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(values));
        } catch {
          // Storage full or unavailable — silently ignore
        }
      }, 300);
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, storageKey, enabled]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { clearDraft };
}

/**
 * Imperatively clear a draft (useful outside of the hook, e.g. in a
 * server action callback that doesn't have the hook reference).
 */
export function clearDraft(key: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}
