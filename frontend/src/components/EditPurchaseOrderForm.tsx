"use client";

import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Paper,
    Grid,
    IconButton,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { usePurchaseOrderApi } from "../api/purchaseOrders";
import { useProductApi } from "../api/products";
import {
    ProductResponse,
    PurchaseOrderUpdate,
    PurchaseOrderItemCreate,
    PurchaseOrderStatus,
} from "../types/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EditPurchaseOrderFormProps {
    purchaseOrderId: string;
    onSuccess?: () => void;
}

const EditPurchaseOrderForm: React.FC<EditPurchaseOrderFormProps> = ({
    purchaseOrderId,
    onSuccess,
}) => {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { getProducts } = useProductApi();
    const { getPurchaseOrderById, updatePurchaseOrder } = usePurchaseOrderApi();

    // Local UI state
    const [supplierName, setSupplierName] = useState<string>("");
    const [status, setStatus] = useState<PurchaseOrderStatus | "">("");
    const [items, setItems] = useState<PurchaseOrderItemCreate[]>([]);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetching purchase order details with useQuery
    const {
        data: initialOrder,
        isLoading: isOrderLoading,
        isError: isOrderError,
        error: orderError,
    } = useQuery({
        queryKey: ['purchaseOrder', purchaseOrderId],
        queryFn: () => getPurchaseOrderById(purchaseOrderId),
        enabled: !!user && !!purchaseOrderId,
    });

    // Fetching products with useQuery
    const {
        data: products = [],
        isLoading: areProductsLoading,
        isError: isProductsError,
        error: productsError,
    } = useQuery({
        queryKey: ['products'],
        queryFn: () => getProducts(), // Wrap in an anonymous function
        enabled: !!user,
    });

    // Effect to populate form state once data is fetched
    useEffect(() => {
        if (initialOrder) {
            setSupplierName(initialOrder.supplierName || "");
            setStatus(initialOrder.status);
            setItems(
                initialOrder.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                }))
            );
        }
    }, [initialOrder]);

    const updateMutation = useMutation({
        mutationFn: (updateData: PurchaseOrderUpdate) => updatePurchaseOrder(purchaseOrderId, updateData),
        onSuccess: (data) => {
            setSuccess("Purchase Order updated successfully!");
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['purchaseOrder', purchaseOrderId] });
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            if (onSuccess) {
                onSuccess();
            }
            // Optional: redirect after a short delay
            setTimeout(() => {
                router.push(`/dashboard/purchase-orders/${purchaseOrderId}`);
            }, 1000);
        },
    });

    const handleAddItem = () => {
        setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleItemChange = (
        index: number,
        field: keyof PurchaseOrderItemCreate,
        value: string | number
    ) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            updateMutation.reset(); // Clear any previous error state
            // This should ideally not happen due to query `enabled` flag
            return;
        }

        const updateData: PurchaseOrderUpdate = {
            supplierName: supplierName || null,
            status: status === "" ? undefined : status,
        };
        updateMutation.mutate(updateData);
    };

    if (isOrderLoading || areProductsLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    const queryError = orderError || productsError;
    if (isOrderError || isProductsError) {
        return (
            <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
                Error: {queryError instanceof Error ? queryError.message : "Failed to fetch data."}
            </Typography>
        );
    }

    if (!initialOrder) {
        return (
            <Typography variant="h6" sx={{ mt: 4, textAlign: "center" }}>
                Purchase Order not found.
            </Typography>
        );
    }

    const isEditable = user?.role === "ADMIN" || (user?.role === "DAF" && initialOrder.status === PurchaseOrderStatus.DRAFT);
    const canEditItems = initialOrder.status === PurchaseOrderStatus.DRAFT && initialOrder.requestedById === user?.id;
    const canChangeStatus = user?.role === "ADMIN" || user?.role === "DAF";

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
                Edit Purchase Order {initialOrder.orderNumber}
            </Typography>
            {updateMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{updateMutation.error.message}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <form onSubmit={handleSubmit}>
                <TextField
                    label="Supplier Name"
                    fullWidth
                    margin="normal"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    disabled={!isEditable}
                />


                <FormControl fullWidth margin="normal" disabled={!canChangeStatus}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={status}
                        label="Status"
                        onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                    >
                        {Object.values(PurchaseOrderStatus).map((statusOption) => (
                            <MenuItem key={statusOption} value={statusOption}>
                                {statusOption.replace(/_/g, " ")}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                    Order Items
                </Typography>
                {items.map((item, index) => (
                    <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={5}>
                            <FormControl fullWidth margin="normal" disabled={!canEditItems}>
                                <InputLabel>Product</InputLabel>
                                <Select
                                    value={item.productId}
                                    label="Product"
                                    onChange={(e) =>
                                        handleItemChange(index, "productId", e.target.value)
                                    }
                                    required
                                >
                                    {products.map((product) => (
                                        <MenuItem key={product.id} value={product.id}>
                                            {product.name} ({product.reference})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Quantity"
                                type="number"
                                fullWidth
                                margin="normal"
                                value={item.quantity}
                                onChange={(e) =>
                                    handleItemChange(index, "quantity", e.target.value)
                                }
                                inputProps={{ min: 1 }}
                                required
                                disabled={!canEditItems}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField
                                label="Unit Price"
                                type="number"
                                fullWidth
                                margin="normal"
                                value={item.unitPrice}
                                onChange={(e) =>
                                    handleItemChange(index, "unitPrice", e.target.value)
                                }
                                inputProps={{ min: 0, step: "0.01" }}
                                required
                                disabled={!canEditItems}
                            />
                        </Grid>
                        <Grid item xs={12} sm={1}>
                            <IconButton onClick={() => handleRemoveItem(index)} color="error" disabled={!canEditItems}>
                                <RemoveIcon />
                            </IconButton>
                        </Grid>
                    </Grid>
                ))}
                <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    variant="outlined"
                    sx={{ mt: 1, mb: 2 }}
                    disabled={!canEditItems}
                >
                    Add Item
                </Button>

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={updateMutation.isPending || (!isEditable && !canChangeStatus)}
                    sx={{ mt: 3 }}
                >
                    {updateMutation.isPending ? <CircularProgress size={24} /> : "Update Purchase Order"}
                </Button>
            </form>
        </Paper>
    );
};

export default EditPurchaseOrderForm;
