import { useRuntime } from 'vtex.render-runtime';
import { mapProductForGA4 } from '../utils';

export const useGAAnalytics = () => {
    const { query } = useRuntime();

    const pushEvent = (eventName: string, product: any, skuId: string) => {
        const searchTerm = query?.query || (new URLSearchParams(window.location.search)).get('query') || '';
        const gaItem = mapProductForGA4(product, skuId);

        const eventBody = {
            event: eventName,
            search_term: searchTerm,
            ecommerce: {
                items: [gaItem]
            }
        };

        console.log(`[GA4] ${eventName} Push:`, eventBody);

        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).dataLayer.push(eventBody);
    };

    const pushWishlistEvent = (product: any, skuId: string) => {
        pushEvent('add_to_wishlist_empathy', product, skuId);
    };

    const pushAddToCartEvent = (product: any, skuId: string) => {
        pushEvent('add_to_cart_empathy', product, skuId);
    };

    const pushRemoveFromCartEvent = (product: any, skuId: string) => {
        pushEvent('remove_from_cart_empathy', product, skuId);
    };

    return {
        pushWishlistEvent,
        pushAddToCartEvent,
        pushRemoveFromCartEvent
    };
};
