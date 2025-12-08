"use client";

import React from "react";
import { useParams } from "next/navigation";
import EditPurchaseOrderForm from "../../../../../components/EditPurchaseOrderForm";
import { Box, Typography } from "@mui/material";

const EditPurchaseOrderPage: React.FC = () => {
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

    return (
        <Box sx={{ p: 3 }}>
            <EditPurchaseOrderForm purchaseOrderId={purchaseOrderId} />
        </Box>
    );
};

export default EditPurchaseOrderPage;
