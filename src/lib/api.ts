import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { QueuedAction } from '@/pwa/offline-queue';
import type {
  CsvImportRow,
  InventoryItem,
  InventoryListParams,
  InventoryUpdateInput,
  ScanAddItemInput,
} from '@/types/inventory';

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (params: InventoryListParams) => [...inventoryKeys.all, 'list', params] as const,
  detail: (upc: string) => [...inventoryKeys.all, 'detail', upc] as const,
};

const MOCK_INVENTORY: InventoryItem[] = [
  {
    upc: '071984000012',
    name: 'Coors Light 12pk 12oz Cans',
    category: 'Beer',
    currentStock: 48,
    reorderPoint: 24,
    packSize: 12, // case-break support
  },
  {
    upc: '082184000012',
    name: "Jack Daniel's Tennessee Whiskey 750ml",
    category: 'Spirits',
    currentStock: 3,
    reorderPoint: 12,
    packSize: 1,
  },
  {
    upc: '619947000011',
    name: "Tito's Handmade Vodka 1L",
    category: 'Spirits',
    currentStock: 22,
    reorderPoint: 10,
    packSize: 1,
  },
  {
    upc: '018200000103',
    name: 'Bud Light 12pk 12oz Cans',
    category: 'Beer',
    currentStock: 5,
    reorderPoint: 24,
    packSize: 12,
  },
  {
    upc: '85000029204',
    name: 'Yellow Tail Cabernet Sauvignon 750ml',
    category: 'Wine',
    currentStock: 18,
    reorderPoint: 8,
    packSize: 1,
  },
  {
    upc: '012000161155',
    name: 'Tonic Water 1L',
    category: 'Mixers',
    currentStock: 14,
    reorderPoint: 6,
    packSize: 1,
  },
  // Demo real-style UPCs for free lookup testing (will be overridden by live OFF API if not matched)
  {
    upc: '0123456789012',
    name: 'Bud Light 12pk Cans',
    category: 'Beer',
    currentStock: 24,
    reorderPoint: 10,
    packSize: 12,
  },
  {
    upc: '049000042566',
    name: 'Jack Daniels Old No.7 750ml',
    category: 'Spirits',
    currentStock: 12,
    reorderPoint: 5,
    packSize: 1,
  },
  {
    upc: '088470000123',
    name: 'Titos Handmade Vodka 1L',
    category: 'Spirits',
    currentStock: 18,
    reorderPoint: 8,
    packSize: 1,
  },
];

let mockStore = [...MOCK_INVENTORY];

function useMockApi(): boolean {
  return !import.meta.env.VITE_API_URL;
}

function filterInventory(items: InventoryItem[], params: InventoryListParams): InventoryItem[] {
  const search = params.search?.trim().toLowerCase();
  const category = params.category ?? 'All';

  return items.filter((item) => {
    const matchesCategory = category === 'All' || item.category === category;
    const matchesSearch =
      !search || item.name.toLowerCase().includes(search) || item.upc.includes(search);
    return matchesCategory && matchesSearch;
  });
}

async function fetchInventory(params: InventoryListParams = {}): Promise<InventoryItem[]> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 300));
    return filterInventory(mockStore, params);
  }
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category && params.category !== 'All') query.set('category', params.category);
  const qs = query.toString();
  return apiClient<InventoryItem[]>(`/api/inventory${qs ? `?${qs}` : ''}`);
}

async function fetchInventoryItem(upc: string): Promise<InventoryItem | null> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 150));
    return mockStore.find((i) => i.upc === upc) ?? null;
  }
  try {
    return await apiClient<InventoryItem>(`/api/inventory/${upc}`);
  } catch {
    return null;
  }
}

export async function fetchProduct(upc: string): Promise<any | null> {
  if (useMockApi()) {
    // In mock, fall back to OFF or local
    await new Promise((r) => setTimeout(r, 100));
    return mockStore.find((i) => i.upc === upc) ?? null;
  }
  try {
    // Try backend product catalog (populated from OFF dump - only liquor entries)
    const product = await apiClient<any>(`/api/inventory/products/${upc}`);
    if (product) {
      // Normalize for frontend (dump uses 'photo', 'packSize')
      return {
        ...product,
        photo: product.photo || product.imageUrl || product.image_url || null,
        packSize: product.packSize || 1,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function createInventoryItem(input: ScanAddItemInput): Promise<InventoryItem> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 400));
    const existing = mockStore.find((i) => i.upc === input.upc);
    if (existing) {
      const updated = { ...existing, currentStock: existing.currentStock + input.quantity };
      mockStore = mockStore.map((i) => (i.upc === input.upc ? updated : i));
      return updated;
    }
    const created: InventoryItem = {
      upc: input.upc,
      name: input.name,
      category: input.category,
      currentStock: input.quantity,
      reorderPoint: 6,
      packSize: input.packSize ?? 1,
      updatedAt: new Date().toISOString(),
    };
    mockStore = [...mockStore, created];
    return created;
  }
  return apiClient<InventoryItem>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

async function updateInventoryItem(input: InventoryUpdateInput): Promise<InventoryItem> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 350));
    const existing = mockStore.find((i) => i.upc === input.upc);
    if (!existing) throw new Error('Item not found');
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
    mockStore = mockStore.map((i) => (i.upc === input.upc ? updated : i));
    return updated;
  }
  return apiClient<InventoryItem>(`/api/inventory/${input.upc}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

async function importInventoryRows(rows: CsvImportRow[]): Promise<{ imported: number }> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 800));
    for (const row of rows) {
      const existing = mockStore.find((i) => i.upc === row.upc);
      if (existing) {
        mockStore = mockStore.map((i) =>
          i.upc === row.upc
            ? {
                ...i,
                name: row.name,
                category: row.category,
                currentStock: row.currentStock,
                reorderPoint: row.reorderPoint ?? i.reorderPoint,
                packSize: row.packSize ?? i.packSize ?? 1,
                updatedAt: new Date().toISOString(),
              }
            : i,
        );
      } else {
        mockStore = [
          ...mockStore,
          {
            ...row,
            updatedAt: new Date().toISOString(),
          },
        ];
      }
    }
    return { imported: rows.length };
  }
  return apiClient<{ imported: number }>('/api/inventory/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

async function scanDecrementStock(upc: string, delta = -1): Promise<InventoryItem> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 200));
    const existing = mockStore.find((i) => i.upc === upc);
    if (!existing) throw new Error('Item not found');
    const updated = {
      ...existing,
      currentStock: Math.max(0, existing.currentStock + delta),
      updatedAt: new Date().toISOString(),
    };
    mockStore = mockStore.map((i) => (i.upc === upc ? updated : i));
    return updated;
  }
  return apiClient<InventoryItem>('/api/inventory/scan', {
    method: 'POST',
    body: JSON.stringify({ upc, delta }),
  });
}

export function useInventoryList(params: InventoryListParams = {}) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => fetchInventory(params),
    placeholderData: (prev) => prev,
    networkMode: 'always',
  });
}

export function useInventoryItem(upc: string | null) {
  return useQuery({
    queryKey: inventoryKeys.detail(upc ?? ''),
    queryFn: () => (upc ? fetchInventoryItem(upc) : null),
    enabled: Boolean(upc),
    networkMode: 'always',
  });
}

export function useAddInventoryItem(
  options?: UseMutationOptions<InventoryItem, Error, ScanAddItemInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: createInventoryItem,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const previous = queryClient.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.all });

      queryClient.setQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.all }, (old) => {
        if (!old) return old;
        const existing = old.find((i) => i.upc === input.upc);
        if (existing) {
          return old.map((i) =>
            i.upc === input.upc ? { ...i, currentStock: i.currentStock + input.quantity } : i,
          );
        }
        return [
          ...old,
          {
            upc: input.upc,
            name: input.name,
            category: input.category,
            currentStock: input.quantity,
            packSize: input.packSize ?? 1,
          },
        ];
      });

      return { previous };
    },
    onError: (_err, _input, context) => {
      const ctx = context as { previous?: [unknown, InventoryItem[] | undefined][] } | undefined;
      ctx?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useUpdateInventoryItem(
  options?: UseMutationOptions<InventoryItem, Error, InventoryUpdateInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: updateInventoryItem,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const previous = queryClient.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.all });

      queryClient.setQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.all }, (old) => {
        if (!old) return old;
        return old.map((i) => (i.upc === input.upc ? { ...i, ...input } : i));
      });

      return { previous };
    },
    onError: (_err, _input, context) => {
      const ctx = context as { previous?: [unknown, InventoryItem[] | undefined][] } | undefined;
      ctx?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useImportInventory(
  options?: UseMutationOptions<{ imported: number }, Error, CsvImportRow[]>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: importInventoryRows,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

function applyQueuedActionToMock(action: QueuedAction): void {
  const { upc } = action.payload;

  if (action.type === 'add') {
    const quantity = action.payload.quantity ?? 1;
    const name = action.payload.name ?? action.payload.productName ?? `Item ${upc}`;
    const category = (action.payload.category ?? 'Beer') as InventoryItem['category'];
    const existing = mockStore.find((i) => i.upc === upc);
    if (existing) {
      mockStore = mockStore.map((i) =>
        i.upc === upc
          ? {
              ...i,
              currentStock: i.currentStock + quantity,
              name,
              category,
              packSize: (action.payload as any).packSize ?? i.packSize ?? 1,
              updatedAt: new Date().toISOString(),
            }
          : i,
      );
    } else {
      mockStore = [
        ...mockStore,
        {
          upc,
          name,
          category,
          currentStock: quantity,
          reorderPoint: 6,
          packSize: (action.payload as any).packSize ?? 1,
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    return;
  }

  const delta = action.type === 'sale' ? (action.payload.delta ?? -1) : (action.payload.delta ?? 0);
  if (delta === 0) return;

  mockStore = mockStore.map((i) =>
    i.upc === upc
      ? {
          ...i,
          currentStock: Math.max(0, i.currentStock + delta),
          updatedAt: new Date().toISOString(),
        }
      : i,
  );
}

export async function syncOfflineActions(actions: QueuedAction[]): Promise<{ synced: number }> {
  if (useMockApi()) {
    await new Promise((r) => setTimeout(r, 400));
    for (const action of actions) {
      applyQueuedActionToMock(action);
    }
    return { synced: actions.length };
  }

  const result = await apiClient<{ synced: number }>('/api/inventory/sync', {
    method: 'POST',
    body: JSON.stringify({ actions }),
  });
  return result;
}

export function useScanDecrement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ upc, delta }: { upc: string; delta?: number }) => scanDecrementStock(upc, delta),
    onMutate: async ({ upc, delta = -1 }) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const previous = queryClient.getQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.all });

      queryClient.setQueriesData<InventoryItem[]>({ queryKey: inventoryKeys.all }, (old) => {
        if (!old) return old;
        return old.map((i) =>
          i.upc === upc ? { ...i, currentStock: Math.max(0, i.currentStock + delta) } : i,
        );
      });

      return { previous };
    },
    onError: (_err, _input, context) => {
      const ctx = context as { previous?: [unknown, InventoryItem[] | undefined][] } | undefined;
      ctx?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
