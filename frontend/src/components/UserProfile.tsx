import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAuth } from '../context/AuthContext';
import { UserUpdate, PasswordUpdate } from '../types/api';
import { useUserApi } from '../api/users';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { getUserProfile, updateUserProfile, changeUserPassword } = useUserApi(); // Call the hook

  // Local UI state
  const [editMode, setEditMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(''); // NEW
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password change local state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch user profile
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updatedData: UserUpdate) => updateUserProfile(updatedData),
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data); // Optimistically update the cache
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setSuccessMessage('Profile updated successfully!');
      setEditMode(false);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: PasswordUpdate) => changeUserPassword(passwordData),
    onSuccess: () => {
      setSuccessMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError(null);
    },
  });

  // Effect to populate form when profile data is loaded
  useEffect(() => {
    if (profile) {
      setUsername(profile.username); // NEW
      setName(profile.name);
      setEmail(profile.email || ''); // Email is optional now
      setDepartment(profile.department || '');
    }
  }, [profile]);

  const handleUpdateProfile = () => {
    const updatedData: UserUpdate = { username, name, email: email || undefined, department: department || null }; // NEW: username added, email optional
    updateProfileMutation.mutate(updatedData);
  };

  const handleChangePassword = () => {
    setPasswordError(null);
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (!currentPassword || !newPassword) {
      setPasswordError('Current and new passwords are required.');
      return;
    };
    const passwordUpdateData: PasswordUpdate = {
      current_password: currentPassword,
      new_password: newPassword,
    };
    changePasswordMutation.mutate(passwordUpdateData);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset form fields to profile data
    if (profile) {
      setUsername(profile.username); // NEW
      setName(profile.name);
      setEmail(profile.email || ''); // Email is optional now
      setDepartment(profile.department || '');
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{(error as Error).message}</Alert>
      </Container>
    );
  }

  const mutationError = updateProfileMutation.error || changePasswordMutation.error;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Profile
      </Typography>

      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={() => setSuccessMessage(null)}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      <Snackbar open={!!mutationError} autoHideDuration={6000} onClose={() => { updateProfileMutation.reset(); changePasswordMutation.reset(); }}>
        <Alert onClose={() => { updateProfileMutation.reset(); changePasswordMutation.reset(); }} severity="error" sx={{ width: '100%' }}>
          {(mutationError as Error)?.message}
        </Alert>
      </Snackbar>
      <Snackbar open={!!passwordError} autoHideDuration={6000} onClose={() => setPasswordError(null)}>
        <Alert onClose={() => setPasswordError(null)} severity="error" sx={{ width: '100%' }}>
          {passwordError}
        </Alert>
      </Snackbar>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Profile Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth margin="normal" disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth margin="normal" disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email (Optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth margin="normal" disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} fullWidth margin="normal" disabled={!editMode} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Role" value={profile?.role || ''} fullWidth margin="normal" disabled />
            </Grid>
            <Grid item xs={12}>
              {editMode ? (
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button variant="contained" onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                  <Button variant="outlined" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Button variant="contained" onClick={() => setEditMode(true)} sx={{ mt: 2 }}>
                  Edit Profile
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Change Password
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth margin="normal" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth margin="normal" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Confirm New Password" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} fullWidth margin="normal" />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="primary" onClick={handleChangePassword} sx={{ mt: 2 }} disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default UserProfile;
