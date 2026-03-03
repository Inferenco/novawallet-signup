import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchEventFeeConfig,
  fetchEventsPage,
  fetchUserEvents,
  fetchUserPendingEvents
} from "@/services/events/read";
import { eventsQueryKeys } from "./queryKeys";

const POLL_INTERVAL_MS = 30000;

export function useEventFeesQuery() {
  return useQuery({
    queryKey: eventsQueryKeys.fees(),
    queryFn: fetchEventFeeConfig,
    staleTime: 15000
  });
}

export function usePublicEventsQuery({
  page,
  pageSize,
  category
}: {
  page: number;
  pageSize: number;
  category: string;
}) {
  return useQuery({
    queryKey: eventsQueryKeys.publicList(pageSize, page * pageSize, category),
    queryFn: async () => {
      const rows = await fetchEventsPage({ limit: pageSize, offset: page * pageSize });
      if (!category || category === "All") return rows;
      return rows.filter((event) => event.category === category);
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  });
}

export function useUserEventsQuery({
  address,
  page,
  pageSize
}: {
  address: string | null;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: eventsQueryKeys.userList(address ?? "", pageSize, page * pageSize),
    queryFn: async () => {
      if (!address) return [];
      return fetchUserEvents(address, { limit: pageSize, offset: page * pageSize });
    },
    enabled: Boolean(address),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  });
}

export function useUserPendingEventsQuery({
  address,
  page,
  pageSize
}: {
  address: string | null;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: eventsQueryKeys.userPending(address ?? "", pageSize, page * pageSize),
    queryFn: async () => {
      if (!address) return [];
      return fetchUserPendingEvents(address, {
        limit: pageSize,
        offset: page * pageSize
      });
    },
    enabled: Boolean(address),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false
  });
}

export function useCategoryOptions(
  categoriesSource: Array<{ category: string }> | undefined
): string[] {
  return useMemo(() => {
    if (!categoriesSource) return ["All"];
    const unique = new Set(categoriesSource.map((event) => event.category).filter(Boolean));
    return ["All", ...Array.from(unique).sort()];
  }, [categoriesSource]);
}
