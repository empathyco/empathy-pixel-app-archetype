import React, { useEffect, useRef } from "react";
import { useOrderItems } from 'vtex.order-items/OrderItems';
import { useOrderForm } from 'vtex.order-manager/OrderForm';
import { handleCartOperation } from "./utils/handleCart";
import { useEmpathyWishlist } from './hooks/handleWishlist';
import { findProductBySkuId } from './utils';
import { useGAAnalytics } from './hooks/useGAAnalytics';
import { useSessionListener } from './hooks/useSessionListener';
import { ACTIONS } from './constants';

const EmpathySearchbar = () => {
    useSessionListener();
    const { pushAddToCartEvent, pushRemoveFromCartEvent } = useGAAnalytics();
    const { addItems, updateQuantity, removeItem } = useOrderItems();
    const {
        orderForm: { items: cartItems },
    } = useOrderForm();

    const itemsRef = useRef(cartItems);

    const { handleWishlistOperation } = useEmpathyWishlist();

    const wishlistActionRef = useRef(handleWishlistOperation);

    useEffect(() => {
        wishlistActionRef.current = handleWishlistOperation;
    }, [handleWishlistOperation]);

    useEffect(() => {
        itemsRef.current = cartItems;
    }, [cartItems]);



    async function handleClickAction({
        sellerId, quantity, productSKU
    }: any) {
        if (!productSKU || !sellerId) {
            console.error("Error: productSKU or seller_id not defined", { productSKU, sellerId });
            return null;
        }

        if (quantity <= 0) {
            quantity = -1;
        }

        let item_object = {
            id: Number(productSKU),
            quantity,
            seller: sellerId
        };

        return item_object;
    }

    async function handleActionAddToCart({ action, skuId, quantity }: any) {
        console.log("Processing AddToCart for SKU:", skuId, "Action:", action);

        const productData: any = await findProductBySkuId(skuId);
        const product = productData && productData.length > 0 ? productData[0] : null;

        const item_object = await handleClickAction({
            productSKU: skuId,
            sellerId: 1,
            quantity,
        });

        const foundItem = itemsRef.current?.find((item: any) => item.id === skuId);

        switch (action) {
            case ACTIONS.newProduct:
                if (product) pushAddToCartEvent(product, skuId);
                if (item_object) addItems([item_object]);
                break;
            case ACTIONS.updateQuantity:
                if (product) pushAddToCartEvent(product, skuId);
                if (foundItem) updateQuantity({ uniqueId: foundItem.uniqueId, quantity });
                break;
            case ACTIONS.removeProduct:
                if (product) pushRemoveFromCartEvent(product, skuId);
                if (foundItem) removeItem({ uniqueId: foundItem.uniqueId });
                break;
            default:
                console.error("Unknown action:", action);
                return;
        }
    }

    useEffect(() => {
        /**
         * Asegurate de ajustar la configuración de `initX` según las necesidades de tu tienda.
         * 
         * Más información en https://github.com/empathyco/empathy-pixel-app-archetype?#3-configuraci%C3%B3n-initx
         */
        (window as any).initX = {
            instance: "empathy",
            lang: "es",
            scope: "desktop",
            currency: "EUR",
            consent: true,
            viewMode: 'embedded',
            callbacks: {
                UserClickedResultAddToCart: function (result: any, metadata: any) {
                    const cart = (window as any).InterfaceX?.getSnippetConfig()?.cart || {};
                    handleCartOperation({
                        result,
                        metadata: metadata || {},
                        cart,
                        actionType: 'add',
                        handleActionAddToCart
                    });
                },
                UserClickedResultVariantAddToCart: function (result: any, metadata: any) {
                    const cart = (window as any).InterfaceX?.getSnippetConfig()?.cart || {};
                    handleCartOperation({
                        result,
                        metadata: metadata || {},
                        cart,
                        actionType: 'add',
                        handleActionAddToCart
                    });
                },
                UserClickedResultRemoveFromCart: function (result: any, metadata: any) {
                    const cart = (window as any).InterfaceX?.getSnippetConfig()?.cart || {};
                    handleCartOperation({
                        result,
                        metadata: metadata || {},
                        cart,
                        actionType: 'remove',
                        handleActionAddToCart
                    });
                },
                UserClickedResultVariantRemoveFromCart: function (result: any, metadata: any) {
                    const cart = (window as any).InterfaceX?.getSnippetConfig()?.cart || {};
                    handleCartOperation({
                        result,
                        metadata: metadata || {},
                        cart,
                        actionType: 'remove',
                        handleActionAddToCart
                    });
                },
                UserClickedResultWishlist: function (result: any) {
                    if (wishlistActionRef.current) {
                        wishlistActionRef.current(result);
                    }
                }
            }
        };

        (window as any).InterfaceX?.init();

    }, []);

    return (
        <div id="empathy-searchbar">
            <div className="w-100" id="empathy-input" data-teleport="empathy-search-box-container"></div>
        </div>
    );
}

export default EmpathySearchbar
