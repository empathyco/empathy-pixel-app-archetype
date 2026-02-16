import { useEffect } from "react";
import { useFullSession } from "vtex.session-client";

export const useSessionListener = () => {
    const { data: session, loading } = useFullSession({ variables: { items: ['*'] } });

    useEffect(() => {
        if (loading || !session) return;

        console.log("Full Session Data (useFullSession):", session);

        const encodedRegionId = (session as any)?.session?.namespaces?.checkout?.regionId?.value;

        if (encodedRegionId) {
            if (encodedRegionId.includes("v2")) {
                console.log("Region ID (v2 format detected):", encodedRegionId);
            } else {
                try {
                    const regionId = atob(encodedRegionId);
                    console.log("Decoded Region ID (atob):", regionId);
                } catch (error) {
                    console.error("Error decoding regionId with atob:", error);
                }
            }
        } else {
            console.log("No regionId found in session.");
        }
    }, [session, loading]);
};
