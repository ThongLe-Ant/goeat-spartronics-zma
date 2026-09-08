// GoEat ZMA — thẻ nhận cơm + lịch sử suất ăn (đọc, không có ghi).
import { useCallback, useEffect, useState } from "react";
import { fetchOrderHistory, fetchPickupCard } from "@/api/ordering";
import type { OrderHistoryItem, PickupCardData } from "@/api/types";

function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(() => {
    setLoading(true);
    fn().then(
      (d) => {
        setData(d);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e?.message ?? "Không tải được dữ liệu");
        setLoading(false);
      },
    );
  }, [fn]);
  useEffect(() => {
    run();
  }, [run]);
  return { data, error, loading, reload: run };
}

export const usePickupCard = () => useAsync<PickupCardData>(fetchPickupCard);
export const useOrderHistory = () => useAsync<OrderHistoryItem[]>(fetchOrderHistory);
