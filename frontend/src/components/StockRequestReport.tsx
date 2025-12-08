import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // New import
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'; // New import
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // New import
import dayjs, { Dayjs } from 'dayjs'; // New import
import { StockRequestReportResponse, UserFullResponse } from "@/types/api";
import { RequestStatus } from "@/types/api"; // Assuming RequestStatus enum is in api.ts

import { useApiClient } from '@/api/client'; // New import
import { useUserApi } from '@/api/users'; // New import

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"; // No longer needed here

const StockRequestReport: React.FC = () => {
  const apiClient = useApiClient(); // Initialize API client
  const userApi = useUserApi(); // Initialize User API

  const [reportData, setReportData] = useState<StockRequestReportResponse[]>([]);
  const [users, setUsers] = useState<UserFullResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [requesterId, setRequesterId] = useState<string>("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null); // Changed type
  const [endDate, setEndDate] = useState<Dayjs | null>(null);     // Changed type

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (requesterId) params.append("requester_id", requesterId);
      if (startDate) params.append("start_date", startDate.format('YYYY-MM-DD')); // Formatted for backend
      if (endDate) params.append("end_date", endDate.format('YYYY-MM-DD'));     // Formatted for backend

      const data: StockRequestReportResponse[] = await apiClient.get<StockRequestReportResponse[]>(`/reports/stock-requests?${params.toString()}`);
      setReportData(data);
    } catch (err: unknown) {
      console.error('Error fetching stock request report:', err);
      setError(err instanceof Error ? err.message : "Failed to fetch stock request report.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data: UserFullResponse[] = await userApi.getRequestCreators(); // Call new function
      setUsers(data);
    } catch (err: unknown) {
      console.error("Failed to fetch users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users."); // Set error state
    }
  };

  useEffect(() => {
    fetchReport();
    fetchUsers();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rapport sur les Demandes de Matériel
        </Typography>

        <Box component="form" onSubmit={handleFilterSubmit} sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={status}
                  label="Statut"
                  onChange={(e) => setStatus(e.target.value as RequestStatus | "")}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {Object.values(RequestStatus).map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Demandeur</InputLabel>
                <Select
                  value={requesterId}
                  label="Demandeur"
                  onChange={(e) => setRequesterId(e.target.value as string)}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <DatePicker
                label="Date de début"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <DatePicker
                label="Date de fin"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button type="submit" variant="contained" fullWidth>
                Filtrer
              </Button>
            </Grid>
          </Grid>
        </Box>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="stock request report table">
            <TableHead>
              <TableRow>
                <TableCell>Numéro de Demande</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Demandeur</TableCell>
                <TableCell>Département</TableCell>
                <TableCell>Date de Création</TableCell>
                <TableCell>Articles</TableCell>
                <TableCell>Délai Approbation DAF</TableCell>
                <TableCell>Délai Traitement Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.request_number}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell>{request.requester_name}</TableCell>
                  <TableCell>{request.requester_department || "N/A"}</TableCell>
                  <TableCell>{dayjs(request.created_at).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <ul>
                      {request.items.map((item, index) => (
                        <li key={index}>
                          {item.product_name} (Demandé: {item.requested_qty}, Approuvé: {item.approved_qty ?? "-"})
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>{request.approval_delay_daf || "-"}</TableCell>
                  <TableCell>{request.total_processing_time || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </LocalizationProvider>
  );
};

export default StockRequestReport;
