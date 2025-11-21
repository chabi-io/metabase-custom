import { useEffect, useState } from "react";

import { fetchFiscalCalendarData } from "../fiscalCalendarApi";
import type { FiscalCalendarData } from "../types";

interface UseFiscalCalendarDataOptions {
  cardId: number | null;
  enabled?: boolean;
}

interface UseFiscalCalendarDataResult {
  data: FiscalCalendarData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFiscalCalendarData({
  cardId,
  enabled = true,
}: UseFiscalCalendarDataOptions): UseFiscalCalendarDataResult {
  const [data, setData] = useState<FiscalCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled || !cardId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all fiscal calendar data (no year filtering)
      // Data is small enough to load all at once
      const result = await fetchFiscalCalendarData({
        cardId,
      });
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, enabled]); // Removed fiscalYear - we fetch all years at once now

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
