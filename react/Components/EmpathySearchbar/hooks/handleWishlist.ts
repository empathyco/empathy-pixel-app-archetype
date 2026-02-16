import { useContext, useEffect, useRef } from 'react';
import { useMutation, useLazyQuery } from 'react-apollo';
import { ToastContext } from 'vtex.styleguide';
import { findProductBySkuId } from '../utils';
import { useGAAnalytics } from './useGAAnalytics';

import checkItem from '../gql/checkItem.gql';
import addToList from '../gql/addToList.gql';
import removeFromList from '../gql/removeFromList.gql';

const LIST_NAME = 'Wishlist';
const STORAGE_KEY = 'wishlist_wishlisted';
const AUTH_KEY = 'wishlist_isAuthenticated';
const SHOPPER_KEY = 'wishlist_shopperId';
const ADD_AFTER_LOGIN_KEY = 'wishlist_addAfterLogin';

function getSessionPromise() {
    return window &&
        (window as any).__RENDER_8_SESSION__ &&
        (window as any).__RENDER_8_SESSION__.sessionPromise
        ? ((window as any).__RENDER_8_SESSION__.sessionPromise as Promise<any>)
        : null;
}

export const useEmpathyWishlist = () => {
    const { showToast } = useContext(ToastContext);
    const { pushWishlistEvent } = useGAAnalytics();

    // Mounted Ref
    const isMounted = useRef(true);
    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    // Apollo Hooks
    const [checkItemQuery] = useLazyQuery(checkItem, {
        ssr: false,
        fetchPolicy: 'network-only'
    });
    const [addMutation] = useMutation(addToList);
    const [removeMutation] = useMutation(removeFromList);

    // Local Storage Helpers
    const getLocalWishlist = () => {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
        } catch { return []; }
    };

    const updateLocalWishlist = (productId: string, sku: string, action: 'add' | 'remove') => {
        let list = getLocalWishlist();
        if (action === 'add') {
            if (!list.find((i: any) => i.productId === productId)) {
                list.push({ productId, sku });
            }
        } else {
            list = list.filter((i: any) => i.productId !== productId);
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    };

    // Empathy Visual Helper
    const updateEmpathySnippet = (rawId: string, isAdded: boolean) => {
        if (!window || !(window as any).InterfaceX) return;
        const currentWishlist = (window as any).InterfaceX.getSnippetConfig()?.wishlist || [];
        let updatedWishlist = [...currentWishlist];

        if (isAdded) {
            if (!updatedWishlist.includes(rawId)) updatedWishlist.push(rawId);
        } else {
            updatedWishlist = updatedWishlist.filter((id: string) => id !== rawId);
        }
        (window as any).InterfaceX.setSnippetConfig({ wishlist: updatedWishlist });
    };

    // Session Helper
    const checkSession = async () => {
        const sessionPromise = getSessionPromise();
        if (!sessionPromise) return { isAuthenticated: false, shopperId: null };
        try {
            const sessionRes = await sessionPromise;
            const data = sessionRes?.response;
            if (!data) return { isAuthenticated: false, shopperId: null };
            const isAuthenticated = data.namespaces?.profile?.isAuthenticated?.value === 'true';
            const shopperId = data.namespaces?.profile?.id?.value || data.namespaces?.profile?.email?.value;
            sessionStorage.setItem(AUTH_KEY, JSON.stringify(isAuthenticated));
            if (shopperId) sessionStorage.setItem(SHOPPER_KEY, String(shopperId));
            return { isAuthenticated, shopperId };
        } catch (error) {
            return { isAuthenticated: false, shopperId: null };
        }
    };

    // Main Function
    const handleWishlistOperation = async (result: any) => {
        if (!result || !result.id) return;

        const rawId = String(result.id);
        const skuId = rawId.includes('-') ? rawId.split('-')[0] : rawId;

        try {
            if (!isMounted.current) return;
            const productDataArray: any = await findProductBySkuId(skuId);
            const product = productDataArray?.[0];

            if (!product) return;
            const { productId, productName } = product;

            if (!isMounted.current) return;
            const { isAuthenticated, shopperId } = await checkSession();

            if (!isAuthenticated) {
                if (isMounted.current) {
                    showToast({ message: 'Inicia sesión para usar favoritos' });
                    sessionStorage.setItem(ADD_AFTER_LOGIN_KEY, productId);
                    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.assign(`/login?returnUrl=${returnUrl}`);
                }
                return;
            }

            const checkRes = await checkItemQuery({
                variables: { shopperId: String(shopperId), productId, sku: skuId }
            });

            if (!isMounted.current) return;
            const remoteInList = checkRes?.data?.checkList?.inList;
            const listIds = checkRes?.data?.checkList?.listIds;
            const isInLocal = getLocalWishlist().some((i: any) => i.productId === productId);
            const isWishlisted = remoteInList || isInLocal;

            if (isWishlisted) {
                const listIdToDelete = listIds && listIds.length > 0 ? listIds[0] : null;
                if (listIdToDelete) {
                    await removeMutation({
                        variables: { id: listIdToDelete, shopperId: String(shopperId), name: LIST_NAME }
                    });
                    if (isMounted.current) {
                        showToast({ message: 'Eliminado de favoritos' });
                        // pushGAEvent('remove_from_wishlist_empathy', product, skuId);
                    }
                }
                updateLocalWishlist(productId, skuId, 'remove');
                updateEmpathySnippet(rawId, false);
            } else {
                await addMutation({
                    variables: {
                        listItem: { productId, title: productName, sku: skuId },
                        shopperId: String(shopperId),
                        name: LIST_NAME
                    }
                });
                if (isMounted.current) {
                    showToast({ message: 'Agregado a favoritos' });
                    pushWishlistEvent(product, skuId);
                }
                updateLocalWishlist(productId, skuId, 'add');
                updateEmpathySnippet(rawId, true);
            }

        } catch (error) {
            console.error('Wishlist Error:', error);
            if (isMounted.current) showToast({ message: 'Error al actualizar favoritos' });
        }
    };

    return { handleWishlistOperation };
};
