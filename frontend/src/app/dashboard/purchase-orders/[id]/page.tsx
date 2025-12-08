"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import PurchaseOrderDetail from "../../../../components/PurchaseOrderDetail";
import { Box, Typography } from "@mui/material";

const PurchaseOrderDetailsPage: React.FC = () => {
    const params = useParams();
    const purchaseOrderId = params.id as string;

    if (!purchaseOrderId) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6" color="error">
                    Purchase Order ID not provided.
                </Typography>
            </Box>
        );
    }

    const router = useRouter(); // Call useRouter hook

    const handleBack = () => {
        router.back();
    };

    const handleUpdate = () => {
        // In a real application, you might want to invalidate a query cache here
        // or trigger a re-fetch of the purchase orders list.
        // For now, we'll just log it.
        console.log("Purchase order updated, refreshing list if necessary.");
    };

    return (
        <Box sx={{ p: 3 }}>
            <PurchaseOrderDetail
                purchaseOrderId={purchaseOrderId}
                onBack={handleBack}
                onUpdate={handleUpdate}
            />
        </Box>
    );
};

export default PurchaseOrderDetailsPage;
