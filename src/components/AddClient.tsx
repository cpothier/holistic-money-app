import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  TablePagination,
  Container,
  Tooltip,
  DialogContentText,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchClients, addClient, deleteClient } from '../services/api_new';

interface Client {
  client_id: string;
  client_name: string;
  bigquery_dataset: string;
  comments_table_name: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
}

const AddClient: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientForm, setClientForm] = useState({
    client_name: '',
    bigquery_dataset: '',
    comments_table_name: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch clients on component mount
  useEffect(() => {
    fetchClientsData();
  }, []);

  const fetchClientsData = async () => {
    try {
      const data = await fetchClients();
      // Add status property to each client
      const clientsWithStatus = data.map(client => ({
        ...client,
        status: 'active' as const
      }));
      setClients(clientsWithStatus);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch clients',
        severity: 'error'
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!clientForm.client_name.trim()) {
      errors.client_name = 'Client name is required';
    } else if (!/^[a-z0-9_]+$/.test(clientForm.client_name)) {
      errors.client_name = 'Client name can only contain lowercase letters, numbers, and underscores';
    }

    if (!clientForm.bigquery_dataset.trim()) {
      errors.bigquery_dataset = 'BigQuery dataset is required';
    } else if (!/^[a-z0-9_]+$/.test(clientForm.bigquery_dataset)) {
      errors.bigquery_dataset = 'Dataset name can only contain lowercase letters, numbers, and underscores';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientForm(prev => ({
      ...prev,
      status: e.target.checked ? 'active' : 'inactive'
    }));
  };

  const handleOpenAddDialog = () => {
    setClientForm({ 
      client_name: '', 
      bigquery_dataset: '',
      comments_table_name: '',
      status: 'active'
    });
    setValidationErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setClientForm({ 
      client_name: '', 
      bigquery_dataset: '',
      comments_table_name: '',
      status: 'active'
    });
    setValidationErrors({});
  };

  const handleAddClient = async () => {
    if (!validateForm()) return;

    try {
      const newClient = await addClient({
        ...clientForm,
        comments_table_name: `${clientForm.client_name}_comments`
      });
      setClients(prev => [...prev, newClient]);
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: 'Client added successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding client:', error);
      setSnackbar({
        open: true,
        message: 'Failed to add client',
        severity: 'error'
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteClient(clientId);
      setClients(prev => prev.filter(client => client.client_id !== clientId));
      setSnackbar({
        open: true,
        message: 'Client deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete client',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Client Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add New Client
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client Name</TableCell>
                <TableCell>BigQuery Dataset</TableCell>
                <TableCell>Comments Table</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.client_id}>
                  <TableCell>{client.client_name}</TableCell>
                  <TableCell>{client.bigquery_dataset}</TableCell>
                  <TableCell>{client.comments_table_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={client.status} 
                      color={client.status === 'active' ? 'success' : 'error'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(client.updated_at).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="Delete Client">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClient(client.client_id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add Client Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please enter the client details below. The client name will be used to create a unique table for comments.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              name="client_name"
              label="Client Name"
              type="text"
              fullWidth
              value={clientForm.client_name}
              onChange={handleInputChange}
              error={!!validationErrors.client_name}
              helperText={validationErrors.client_name}
              sx={{ mt: 2 }}
            />
            <TextField
              margin="dense"
              name="bigquery_dataset"
              label="BigQuery Dataset"
              type="text"
              fullWidth
              value={clientForm.bigquery_dataset}
              onChange={handleInputChange}
              error={!!validationErrors.bigquery_dataset}
              helperText={validationErrors.bigquery_dataset}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={clientForm.status === 'active'}
                  onChange={handleStatusChange}
                  name="status"
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleAddClient} 
              variant="contained" 
              color="primary"
              disabled={!clientForm.client_name || !clientForm.bigquery_dataset}
            >
              Add Client
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default AddClient; 