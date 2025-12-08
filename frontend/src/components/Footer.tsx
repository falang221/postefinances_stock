'use client';

import React from 'react';
import { Box, Typography, Container, Divider } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          Développé par Abdourahmane NDIAYE (a.ndiaye2012@gmail.com)
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" component="p">
          Cette application est destinée à un usage interne. Toute reproduction ou vente est interdite sans autorisation préalable.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
