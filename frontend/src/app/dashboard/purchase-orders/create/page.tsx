"use client";

import React from "react";
import { useRouter } from "next/navigation"; // Added useRouter
import CreatePurchaseOrderForm from "../../../../components/CreatePurchaseOrderForm";
import { Box } from "@mui/material";

const CreatePurchaseOrderPage: React.FC = () => {
    const router = useRouter(); // Call useRouter hook

    const handleSuccess = () => {
        router.push('/dashboard/purchase-orders'); // Navigate to purchase orders list
    };

    const handleCancel = () => {
        router.back(); // Navigate back
    };

    return (
        <Box sx={{ p: 3 }}>
            <CreatePurchaseOrderForm
                onSuccess={handleSuccess}
                onCancel={handleCancel}
            />
        </Box>
    );
};

export default CreatePurchaseOrderPage;
