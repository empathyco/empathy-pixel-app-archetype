# Empathy Listener System Roadmap

## Overview
This roadmap outlines the plan to create a centralized listener hook that synchronizes Empathy context (`cart`, `wishlist`, `whitelabel`) with VTEX state changes (`orderForm`, `session`, `wishlist`).

## Core Logic
The listener will primarily react to `orderForm` changes, which serves as the "heartbeat" of the store's state changes.

### `useEmpathyListener` Hook
A new custom hook will be responsible for orchestrating updates.

**Triggers:**
1.  **Mount**: Initial sync.
2.  **OrderForm Update**: React to changes in `useOrderForm`.
3.  **Window Events**: Listen to `orderFormUpdated.vtex` (backup trigger).

**Actions on Trigger:**
1.  **Sync Session (Region/Whitelabel)**
    - Call `refetch()` from `useFullSession`.
    - Decoding `regionId` from `namespaces.checkout.regionId`.
    - Update Empathy: `setSnippetConfig({ whitelabel: { regionId: '...' } })`.

2.  **Sync Cart**
    - Read `orderForm.items`.
    - Format items to Empathy structure (`id`, `sku`, `price`, `quantity`).
    - Update Empathy: `setSnippetConfig({ cart: [...] })`.

3.  **Sync Wishlist**
    - **Note:** Wishlist is expensive to fetch entirely. We need a strategy.
    - *Option A:* Fetch all wishlist items (might be slow if list is huge).
    - *Option B:* [handleWishlist](/empathy-pixel-app-archetype/react/Components/EmpathySearchbar/hooks/handleWishlist.ts#94-166) already manages its state locally + API. We might expose a `refetchWishlist` method.
    - **Recommended:** execute a "Get All Wishlist" query (or rely on `checkItem` for visible products if possible, but user asked to sync changes). We will likely need a `getUserWishlist` query.
    - Update Empathy: `setSnippetConfig({ wishlist: [productIds] })`.

## file Structure

```
react/
  hooks/
    useEmpathyListener.ts  // Central orchestrator
    useSessionListener.ts  // (Existing) Refactor to export data + refetch
  Components/
    EmpathySearchbar/
      index.tsx            // Mounts useEmpathyListener
```

## Implementation Steps

### Phase 1: Preparation (Current)
- [x] Analyze `vtex.session-client`.
- [x] Create [useSessionListener](/empathy-pixel-app-archetype/react/Components/EmpathySearchbar/hooks/useSessionListener.ts#4-30) prototype.
- [ ] Research/Verify Wishlist generic query (`vtex.wish-list` generic query typically requires iterating or getting a specific list).

### Phase 2: Listener Core
- [ ] Create `useEmpathyListener.ts`.
- [ ] Implement `useOrderForm` dependency.
- [ ] Add `useEffect` listening to `orderForm`.

### Phase 3: Connect Data Sources
- [ ] **Cart**: Map `orderForm.items` -> Empathy Cart format.
- [ ] **Session**: Integrate [useSessionListener](/empathy-pixel-app-archetype/react/Components/EmpathySearchbar/hooks/useSessionListener.ts#4-30) logic into the new listener or expose `refetch`.
- [ ] **Wishlist**: Implement `useQuery` for "Get Wishlist" (likely `GetWishlist` from `vtex.wish-list`).

### Phase 4: Integration
- [ ] Replace isolated hooks in [EmpathySearchbar](/empathy-pixel-app-archetype/react/Components/EmpathySearchbar/index.tsx#11-157) with centralized `useEmpathyListener`.
- [ ] Verify functionality (Add to cart -> Console log / Empathy update).

## 🚀 Evolutivos Propuestos

### 1. Sincronización Automática de Carrito

**Objetivo:** Leer el carrito de VTEX al cargar la página y sincronizarlo con Empathy.

**Implementación:**

```tsx
useEffect(() => {
    const initialCart: { [key: string]: number } = {};
    cartItems.forEach((item: any) => {
        initialCart[item.id] = item.quantity;
    });

    (window as any).InterfaceX?.init();
    (window as any).InterfaceX?.setSnippetConfig({ cart: initialCart });
}, []);

// Sincronizar cuando cambie
useEffect(() => {
    if (!(window as any).InterfaceX) return;
    const syncedCart: { [key: string]: number } = {};
    cartItems.forEach((item: any) => {
        syncedCart[item.id] = item.quantity;
    });
    (window as any).InterfaceX.setSnippetConfig({ cart: syncedCart });
}, [cartItems]);
```

**Beneficios:**
- ✅ Usuario ve inmediatamente qué productos ya tiene
- ✅ Sincronización bidireccional
- ✅ Mejor UX

---

### 2. Integración de `regionId` con Whitelabel

**Objetivo:** Leer la región del usuario y pasarla a Empathy para búsquedas específicas por región.

**Implementación:**

```tsx
// utils/getRegionId.ts
export const getRegionId = async (): Promise<string | null> => {
    const sessionPromise = getSessionPromise();
    if (!sessionPromise) return null;
    try {
        const sessionRes = await sessionPromise;
        return sessionRes?.response?.namespaces?.public?.regionId?.value || null;
    } catch {
        return null;
    }
};

// En EmpathySearchbar
useEffect(() => {
    (async () => {
        const regionId = await getRegionId();
        (window as any).initX = {
            // ... config ...
            whitelabel: regionId ? { regionId } : undefined,
            callbacks: { ... }
        };
        (window as any).InterfaceX?.init();
        if (regionId) {
            (window as any).InterfaceX?.setSnippetConfig({ 
                whitelabel: { regionId } 
            });
        }
    })();
}, []);
```

**Beneficios:**
- ✅ Búsquedas contextuales por región
- ✅ Productos específicos por ubicación
- ✅ Mejor relevancia de resultados

---

### 3. Pre-carga de Wishlist

**Objetivo:** Marcar automáticamente productos que ya están en wishlist al cargar la página.

**GraphQL Query nueva:**

```graphql
query GetWishlistItems($shopperId: String!, $name: String!) {
  list(shopperId: $shopperId, name: $name)
    @context(provider: "vtex.wish-list"){
    data {
      productId
      sku
      title
    }
  }
}
```

**Implementación:**

```tsx
export const useInitialWishlist = () => {
    const [loadWishlisted] = useLazyQuery(GET_WISHLIST_ITEMS);

    const loadAndSyncWishlist = async () => {
        try {
            const { isAuthenticated, shopperId } = await checkSession();
            if (!isAuthenticated) return;

            const result = await loadWishlisted({
                variables: { shopperId: String(shopperId), name: 'Wishlist' }
            });

            const wishlistedItems = result?.data?.list?.data || [];
            const wishlistedSkus = wishlistedItems.map((item: any) => item.sku);

            (window as any).InterfaceX?.setSnippetConfig({
                wishlist: wishlistedSkus
            });
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    };

    return { loadAndSyncWishlist };
};
```

**Beneficios:**
- ✅ Productos favoritos aparecen con corazón "filled"
- ✅ Mejor experiencia de usuario
- ✅ Consistencia entre sesiones

---
