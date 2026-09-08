// GoEat ZMA — cổng dữ liệu đặt suất ăn. Chuyển giữa mock và BFF theo API_MODE.
import { api } from "./client";
import { API_MODE } from "./config";
import type { BatchOrderInput, BatchOrderResult, Bootstrap, OrderHistoryItem, PickupCardData, WeeklyMenuData } from "./types";
import { mockBatchOrder, mockBootstrap, mockOrderHistory, mockPickupCard, mockWeekMenu } from "./mock/ordering.mock";

const live = API_MODE === "live";

export const fetchBootstrap = (): Promise<Bootstrap> => (live ? api<Bootstrap>("/api/zma/bootstrap") : mockBootstrap());

export const fetchWeekMenu = (): Promise<WeeklyMenuData> =>
  live ? api<{ data: WeeklyMenuData }>("/api/zma/week-menu").then((r) => r.data) : mockWeekMenu();

export const batchOrder = (input: BatchOrderInput): Promise<BatchOrderResult> =>
  live ? api<{ message: string; data?: { noPortion?: BatchOrderResult["noPortion"] } }>("/api/zma/batch-order", { body: input }).then((r) => ({ message: r.message, noPortion: r.data?.noPortion })) : mockBatchOrder(input);

export const fetchPickupCard = (): Promise<PickupCardData> =>
  live ? api<{ data: PickupCardData }>("/api/zma/ticket").then((r) => r.data) : mockPickupCard();

export const fetchOrderHistory = (): Promise<OrderHistoryItem[]> =>
  live ? api<{ data: OrderHistoryItem[] }>("/api/zma/orders").then((r) => r.data) : mockOrderHistory();
