export const eventsQueryKeys = {
  all: ["events"] as const,
  publicList: (limit: number, offset: number, category: string) =>
    [...eventsQueryKeys.all, "public", limit, offset, category] as const,
  categories: () => [...eventsQueryKeys.all, "categories"] as const,
  fees: () => [...eventsQueryKeys.all, "fees"] as const,
  userList: (address: string, limit: number, offset: number) =>
    [...eventsQueryKeys.all, "user", address, limit, offset] as const,
  userPending: (address: string, limit: number, offset: number) =>
    [...eventsQueryKeys.all, "user-pending", address, limit, offset] as const
};
