"use client";

import React from "react";
import { useRouter } from "next/navigation"; // Added useRouter
import PurchaseOrderList from "@/components/PurchaseOrderList";
import { Box } from "@mui/material";

const PurchaseOrdersPage: React.FC = () => {
    const router = useRouter(); // Call useRouter hook

    const handleViewDetails = (orderId: string) => {
        router.push(`/dashboard/purchase-orders/${orderId}`);
    };

    const handleCreateNew = () => {
        router.push('/dashboard/purchase-orders/create'); // Navigate to create purchase order page
    };

    return (
        <Box sx={{ p: 3 }}>
            <PurchaseOrderList onViewDetails={handleViewDetails} onCreateNew={handleCreateNew} />
        </Box>
    );
};

export default PurchaseOrdersPage;
