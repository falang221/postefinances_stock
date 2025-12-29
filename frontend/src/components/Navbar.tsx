'use client';

import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, Avatar, Tooltip, Badge } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useNotificationCount } from '../context/NotificationCountContext';

// NEW: Sub-component to safely use the notification hook
const NavItemsWithBadges = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { counts } = useNotificationCount();

  const getNavItems = () => {
    if (!user) return [];
    
    const navItems = [];

    let dashboardBadge = 0;
    if (user.role === 'DAF') {
      dashboardBadge = counts.pending_requests_for_daf + counts.pending_purchase_orders_for_daf;
    } else if (user.role === 'MAGASINIER') {
      dashboardBadge = counts.requests_to_deliver_for_magasinier;
    } else if (user.role === 'CHEF_SERVICE') {
        dashboardBadge = counts.requests_to_confirm_for_chef_service;
    }
    navItems.push({ name: 'Tableau de Bord', path: '/dashboard', badgeContent: dashboardBadge });

    if (user.role === 'ADMIN' || user.role === 'DAF' || user.role === 'MAGASINIER') {
      navItems.push({ name: 'Commandes d\'Achat', path: '/dashboard/purchase-orders', badgeContent: counts.pending_purchase_orders_for_daf });
    }
    if (user.role === 'ADMIN' || user.role === 'MAGASINIER') {
      navItems.push({ name: 'Audits d\'Inventaire', path: '/dashboard/inventory-audits', badgeContent: 0 });
    }
    if (user.role === 'ADMIN' || user.role === 'DAF') {
      navItems.push({ name: 'Rapports', path: '/dashboard/reports', badgeContent: 0 });
    }
    navItems.push({ name: 'Aide', path: '/dashboard/help', badgeContent: 0 });
    return navItems;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Navigation Buttons */}
      <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
        {navItems.map((item) => (
          <Button
            key={item.name}
            onClick={() => router.push(item.path)}
            sx={{ my: 2, color: 'white', display: 'block' }}
          >
            <Badge badgeContent={item.badgeContent} color="error" invisible={!item.badgeContent || item.badgeContent === 0}>
              {item.name}
            </Badge>
          </Button>
        ))}
      </Box>

      {/* Mobile Menu Items (for the hamburger menu) */}
      {/* This is a bit of a hack to pass items up to the parent menu, 
          but it keeps the logic clean. A better way might be to use cloneElement. */}
      {(navItems).map((item) => (
        <div key={item.name} data-nav-item={JSON.stringify(item)} style={{ display: 'none' }} />
      ))}
    </>
  );
};


const Navbar: React.FC = () => {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
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
    logout();
    handleCloseUserMenu();
  };

  if (loading) {
    return null;
  }

  // A bit of a workaround to get nav items from the client component
  const navItemsForMenu = anchorElNav ? 
    Array.from(anchorElNav.querySelectorAll('[data-nav-item]')).map(el => JSON.parse(el.getAttribute('data-nav-item')!)) 
    : [];

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}>
          <img src="/Logo_PF.jpeg" alt="Postefinances Logo" style={{ height: '40px', marginRight: '8px' }} loading="eager" />
        </Box>
        <Typography
          variant="h5"
          noWrap
          component="a"
          href="/dashboard"
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

        {/* Hamburger menu for small screens */}
        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
          {user && (
            <>
              <IconButton
                size="large"
                aria-label="navigation menu"
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
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{ display: { xs: 'block', md: 'none' } }}
              >
                {navItemsForMenu.map((item: any) => (
                  <MenuItem key={item.name} onClick={() => {router.push(item.path); handleCloseNavMenu();}}>
                     <Badge badgeContent={item.badgeContent} color="error" invisible={!item.badgeContent || item.badgeContent === 0}>
                      <Typography textAlign="center">{item.name}</Typography>
                    </Badge>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>

        {/* Logo & Title for small screens */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 1, flexGrow: 1, justifyContent: 'center' }}>
            <img src="/Logo_PF.jpeg" alt="Postefinances Logo" style={{ height: '30px', marginRight: '8px' }} loading="eager" />
        </Box>

        {/* Large screen navigation */}
        {user && <NavItemsWithBadges />}

        {/* User menu */}
        {user ? (
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={user.name}>{user.name ? user.name[0].toUpperCase() : ''}</Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="user-menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <MenuItem onClick={() => {router.push('/dashboard/profile'); handleCloseUserMenu(); }}>
                <Typography textAlign="center">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={() => {router.push('/dashboard/help'); handleCloseUserMenu(); }}>
                <Typography textAlign="center">Aide</Typography>
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
