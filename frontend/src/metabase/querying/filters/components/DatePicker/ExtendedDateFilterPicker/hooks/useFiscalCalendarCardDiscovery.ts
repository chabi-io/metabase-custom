import { useMemo } from "react";
import { t } from "ttag";

import { useSearchQuery } from "metabase/api/search";

const FISCAL_CALENDAR_MARKER = "[FISCAL_CALENDAR_SOURCE]";
const PREFERRED_COLLECTION_NAMES = ["Fiscal Calendar", "System Queries"];
const STORAGE_KEY = "metabase.fiscalCalendar.cardId";
const SESSION_CACHE_KEY = "metabase.fiscalCalendar.discovered";

interface UseFiscalCalendarCardDiscoveryResult {
  cardId: number | null;
  isLoading: boolean;
  error: Error | null;
  source: "localStorage" | "auto-discovered" | "not-found";
}

/**
 * Discovers the fiscal calendar card at runtime using convention-based search
 *
 * Discovery strategy:
 * 1. Check localStorage for dev override
 * 2. Search for cards with [FISCAL_CALENDAR_SOURCE] in description
 * 3. Prefer cards in "Fiscal Calendar" or "System Queries" collection
 * 4. Return first match (or null if none found)
 *
 * Performance: Single API call on mount, results cached by RTK Query
 */
export function useFiscalCalendarCardDiscovery(): UseFiscalCalendarCardDiscoveryResult {
  // 1. Try localStorage first (for dev/testing), then sessionStorage cache
  const cachedCardId = useMemo(() => {
    try {
      // Check localStorage override first (highest priority)
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedId = parseInt(stored, 10);
        if (!isNaN(parsedId) && parsedId > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `[FiscalCalendar] Using localStorage override: Card ID ${parsedId}`,
          );
          return parsedId;
        }
      }

      // Check sessionStorage cache (auto-discovered in this session)
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsedId = parseInt(cached, 10);
        if (!isNaN(parsedId) && parsedId > 0) {
          return parsedId;
        }
      }
    } catch (error) {
      // Ignore storage errors (e.g., in incognito mode)
      console.warn("[FiscalCalendar] Storage read failed:", error);
    }
    return null;
  }, []);

  // 2. Search for cards with description marker (skip if cached)
  const {
    data: searchResults,
    isLoading,
    error: searchError,
  } = useSearchQuery(
    cachedCardId
      ? {
          // Skip search if we have cached ID
          q: "",
          limit: 0,
        }
      : {
          q: FISCAL_CALENDAR_MARKER,
          models: ["card", "dataset"],
          filter_items_in_personal_collection: "exclude",
          archived: false,
          limit: 20, // Get multiple results for better matching
        },
  );

  // 3. Find best match from search results
  const discoveredCardId = useMemo(() => {
    if (cachedCardId) {
      return cachedCardId;
    }

    if (!searchResults?.data || searchResults.data.length === 0) {
      return null;
    }

    // Filter to cards with the marker in description
    const markedCards = searchResults.data.filter(
      (card) =>
        card.description && card.description.includes(FISCAL_CALENDAR_MARKER),
    );

    if (markedCards.length === 0) {
      return null;
    }

    // Prefer cards in known system collections
    const preferredCard = markedCards.find((card) =>
      PREFERRED_COLLECTION_NAMES.some(
        (name) =>
          card.collection?.name &&
          card.collection.name.toLowerCase().includes(name.toLowerCase()),
      ),
    );

    const selectedCard = preferredCard || markedCards[0];

    // eslint-disable-next-line no-console
    console.log(
      `[FiscalCalendar] Discovered card: "${selectedCard.name}" (ID: ${selectedCard.id}) in collection "${selectedCard.collection?.name || "root"}"`,
    );

    // Ensure we return a number (SearchResultId can be string | number)
    const cardId =
      typeof selectedCard.id === "number"
        ? selectedCard.id
        : parseInt(String(selectedCard.id), 10);

    if (!isNaN(cardId) && cardId > 0) {
      // Cache discovered card ID in sessionStorage
      try {
        sessionStorage.setItem(SESSION_CACHE_KEY, String(cardId));
      } catch (error) {
        console.warn("[FiscalCalendar] Failed to cache card ID:", error);
      }
      return cardId;
    }

    return null;
  }, [cachedCardId, searchResults]);

  // 4. Determine error state
  const error = useMemo(() => {
    if (searchError) {
      return new Error(
        t`Failed to search for fiscal calendar card: ${searchError}`,
      );
    }

    if (!isLoading && !cachedCardId && !discoveredCardId) {
      return new Error(
        t`Fiscal calendar card not found. Please create a saved question with "${FISCAL_CALENDAR_MARKER}" in the description field. See documentation for setup instructions.`,
      );
    }

    return null;
  }, [searchError, isLoading, cachedCardId, discoveredCardId]);

  // Determine source for debugging
  const source = useMemo(() => {
    try {
      const localOverride = localStorage.getItem(STORAGE_KEY);
      if (localOverride) {
        return "localStorage";
      }
    } catch {
      // Ignore
    }
    return discoveredCardId ? "auto-discovered" : "not-found";
  }, [discoveredCardId]);

  return {
    cardId: discoveredCardId,
    isLoading: !cachedCardId && isLoading,
    error,
    source,
  };
}

/**
 * Dev helper: Set card ID override in localStorage
 * Usage in browser console: setFiscalCalendarCardId(123)
 */
(window as any).setFiscalCalendarCardId = (cardId: number) => {
  localStorage.setItem(STORAGE_KEY, String(cardId));
  // eslint-disable-next-line no-console
  console.log(`[FiscalCalendar] Card ID override set to ${cardId}`);
  // eslint-disable-next-line no-console
  console.log("[FiscalCalendar] Reload page to apply changes");
};

/**
 * Dev helper: Clear card ID override
 * Usage in browser console: clearFiscalCalendarCardId()
 */
(window as any).clearFiscalCalendarCardId = () => {
  localStorage.removeItem(STORAGE_KEY);
  // eslint-disable-next-line no-console
  console.log("[FiscalCalendar] Card ID override cleared");
  // eslint-disable-next-line no-console
  console.log("[FiscalCalendar] Reload page to apply changes");
};
