'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search'; // NEWLY ADDED

import { useUserApi } from '@/api/users';
import { useNotification } from '@/context/NotificationContext';
import { UserFullResponse, UserRole, UserCreate, UserUpdate } from '@/types/api';

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { getUsers, createUser, updateUser, deleteUser } = useUserApi();
  const { showSnackbar, showConfirmation } = useNotification();

  // State for the form dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserFullResponse | null>(null);

  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Fetch users using useQuery
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users', userSearchTerm], // Add searchTerm to queryKey
    queryFn: ({ queryKey }) => {
      const [, searchTerm] = queryKey; // Extract searchTerm from queryKey
      return getUsers(searchTerm);
    },
  });

  // Mutation for creating a user
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      showSnackbar('Utilisateur créé avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Refetch users list
      handleCloseModal();
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  // Mutation for updating a user
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdate }) => updateUser(userId, data),
    onSuccess: () => {
      showSnackbar('Utilisateur mis à jour avec succès !', 'success');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  // Mutation for deleting a user
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showSnackbar('Utilisateur supprimé avec succès.', 'success');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      showSnackbar((err as Error).message, 'error');
    },
  });

  // Modal and form handling
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserFullResponse) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (userId: string) => {
    showConfirmation('Supprimer l\'utilisateur', 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.', () => {
      deleteUserMutation.mutate(userId);
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h2">
          Gestion des Utilisateurs
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateModal}>
          Créer un utilisateur
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <TextField
          label="Rechercher un utilisateur..."
          variant="outlined"
          size="small"
          value={userSearchTerm}
          onChange={(e) => setUserSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })} // Trigger refetch based on userSearchTerm
          startIcon={<SearchIcon />}
        >
          Rechercher
        </Button>
      </Box>

      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">{(error as Error).message}</Alert>}

      {!isLoading && !isError && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Nom d'utilisateur</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Département</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.department || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEditModal(user)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(user.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isModalOpen && <UserFormModal open={isModalOpen} onClose={handleCloseModal} user={editingUser} createMutation={createUserMutation} updateMutation={updateUserMutation} />}
    </Box>
  );
};

// Separate component for the Form Modal to keep logic clean
interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  user: UserFullResponse | null;
  createMutation: any; // Simplified for brevity
  updateMutation: any;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ open, onClose, user, createMutation, updateMutation }) => {
  const [formData, setFormData] = useState<Partial<UserCreate & UserUpdate>>({
    username: user?.username ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? UserRole.CHEF_SERVICE,
    department: user?.department ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) { // Editing
      const updateData: UserUpdate = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMutation.mutate({ userId: user.id, data: updateData });
    } else { // Creating
      createMutation.mutate(formData as UserCreate);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{user ? "Modifier l'utilisateur" : "Créer un nouvel utilisateur"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <TextField name="name" label="Nom" value={formData.name} onChange={handleChange} required fullWidth margin="normal" />
          <TextField name="username" label="Nom d'utilisateur" value={formData.username} onChange={handleChange} required fullWidth margin="normal" />
          <TextField name="email" type="email" label="Email (Optionnel)" value={formData.email} onChange={handleChange} fullWidth margin="normal" />
          <TextField name="password" type="password" label={user ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"} onChange={handleChange} required={!user} fullWidth margin="normal" />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Rôle</InputLabel>
            <Select name="role" value={formData.role} label="Rôle" onChange={handleChange}>
              {Object.values(UserRole).map(role => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField name="department" label="Département (Optionnel)" value={formData.department} onChange={handleChange} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending ? <CircularProgress size={24} /> : (user ? 'Mettre à jour' : 'Créer')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default AdminDashboard;
