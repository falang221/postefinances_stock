'use client';

import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, Avatar, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook

const Navbar: React.FC = () => {
  const router = useRouter();
  const { user, logout, loading } = useAuth(); // Use the authentication context
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    logout(); // Use logout from context
    handleCloseUserMenu();
  };

  const handleDashboardRedirect = () => {
    router.push('/dashboard');
    handleCloseNavMenu();
  };

  // Define navigation settings based on user role
  const getNavItems = () => {
    if (!user) return [];
    const commonItems = [{ name: 'Tableau de Bord', path: '/dashboard' }];
    if (user.role === 'ADMIN' || user.role === 'DAF') {
      commonItems.push({ name: 'Commandes d\'Achat', path: '/dashboard/purchase-orders' });
    }
    if (user.role === 'ADMIN' || user.role === 'MAGASINIER') {
      commonItems.push({ name: 'Audits d\'Inventaire', path: '/dashboard/inventory-audits' });
    }
    // Add role-specific items here if needed
    return commonItems;
  };

  const navItems = getNavItems();

  if (loading) {
    return null; // Don't render navbar until auth state is determined
  }

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo for small screens */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}>
          <img src="/Logo_PF.jpeg" alt="Postefinances Logo" style={{ height: '30px', marginRight: '8px' }} loading="eager" />
        </Box>
        <Typography
          variant="h6" // Changed to h6 for better fit with logo
          noWrap
          sx={{
            mr: 2,
            display: { xs: 'flex', md: 'none' },
            flexGrow: 1,
            fontWeight: 700,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          Postefinances
        </Typography>

        {/* Navigation for small screens */}
        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
          {user && ( // Only show menu if user is logged in
            <>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                }}
              >
                {navItems.map((item) => (
                  <MenuItem key={item.name} onClick={() => router.push(item.path)}>
                    <Typography textAlign="center">{item.name}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>

        {/* Logo for large screens */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}>
          <img src="/Logo_PF.jpeg" alt="Postefinances Logo" style={{ height: '40px', marginRight: '8px' }} loading="eager" />
        </Box>
        <Typography
          variant="h5" // Changed to h5 for better prominence
          noWrap
          sx={{
            mr: 2,
            display: { xs: 'none', md: 'flex' },
            fontWeight: 700,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          Postefinances
        </Typography>

        {/* Navigation for large screens */}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
          {user && navItems.map((item) => (
            <Button
              key={item.name}
              onClick={() => router.push(item.path)}
              sx={{ my: 2, color: 'white', display: 'block' }}
            >
              {item.name}
            </Button>
          ))}
        </Box>

        {/* User menu */}
        {user ? (
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={user.name}>{user.name ? user.name[0].toUpperCase() : ''}</Avatar> {/* Display initial instead of placeholder image */}
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={handleDashboardRedirect}>
                <Typography textAlign="center">Tableau de Bord</Typography>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/dashboard/profile'); handleCloseUserMenu(); }}>
                <Typography textAlign="center">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Typography textAlign="center">Déconnexion</Typography>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button color="inherit" onClick={() => router.push('/')}>Connexion</Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
