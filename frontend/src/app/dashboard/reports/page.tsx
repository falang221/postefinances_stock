'use client';

import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper, Container } from '@mui/material';
import StockStatusReport from '@/components/StockStatusReport';
import StockValueReport from '@/components/StockValueReport';
import StockTurnoverReport from '@/components/StockTurnoverReport';
import StockRequestReport from '@/components/StockRequestReport';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InventoryIcon from '@mui/icons-material/Inventory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `report-tab-${index}`,
    'aria-controls': `report-tabpanel-${index}`,
  };
}

export default function ReportsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Centre de Rapports
      </Typography>
      <Paper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="rapports de stock"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<InventoryIcon />} iconPosition="start" label="État des Stocks" {...a11yProps(0)} />
            <Tab icon={<MonetizationOnIcon />} iconPosition="start" label="Valeur du Stock" {...a11yProps(1)} />
            <Tab icon={<AutorenewIcon />} iconPosition="start" label="Rotation des Stocks" {...a11yProps(2)} />
            <Tab icon={<RequestQuoteIcon />} iconPosition="start" label="Demandes de Matériel" {...a11yProps(3)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <StockStatusReport />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <StockValueReport />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <StockTurnoverReport />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <StockRequestReport />
        </TabPanel>
      </Paper>
    </Container>
  );
}
