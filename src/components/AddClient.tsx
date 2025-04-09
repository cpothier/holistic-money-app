import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
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
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { fetchClients, apiClient } from '../services/api';

interface Client {
  client_id: string;
  client_name: string;
  bigquery_dataset: string;
  comments_table_name: string;
  created_at: string;
  updated_at: string;
}

const AddClient: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientForm, setClientForm] = useState({
    client_name: '',
    bigquery_dataset: ''
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Fetch clients on component mount
  useEffect(() => {
    fetchClientsData();
  }, []);

  const fetchClientsData = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch clients',
        severity: 'error'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setClientForm({ client_name: '', bigquery_dataset: '' });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (client: Client) => {
    setDialogMode('edit');
    setEditingClientId(client.client_id);
    setClientForm({
      client_name: client.client_name,
      bigquery_dataset: client.bigquery_dataset
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setClientForm({ client_name: '', bigquery_dataset: '' });
    setEditingClientId(null);
  };

  const handleAddClient = async () => {
    try {
      const response = await apiClient.post('/clients', clientForm);
      const data = response.data;
      setClients(prev => [...prev, data]);
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

  const handleUpdateClient = async () => {
    if (!editingClientId) return;

    try {
      const response = await apiClient.patch(`/clients/${editingClientId}`, clientForm);
      const updatedClient = response.data;
      setClients(prev => prev.map(client => 
        client.client_id === editingClientId ? updatedClient : client
      ));
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: 'Client updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating client:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update client',
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Client Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add Client
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client Name</TableCell>
                <TableCell>BigQuery Dataset</TableCell>
                <TableCell>Comments Table</TableCell>
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
                  <TableCell>{new Date(client.created_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(client.updated_at).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Client">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenEditDialog(client)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No clients found. Add a client to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Client Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>
            {dialogMode === 'add' ? 'Add New Client' : 'Edit Client'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {dialogMode === 'add' 
                ? 'Enter the client details below. The comments table name will be automatically generated.'
                : 'Update the client details below.'}
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              name="client_name"
              label="Client Name"
              type="text"
              fullWidth
              variant="outlined"
              value={clientForm.client_name}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="bigquery_dataset"
              label="BigQuery Dataset"
              type="text"
              fullWidth
              variant="outlined"
              value={clientForm.bigquery_dataset}
              onChange={handleInputChange}
              helperText="e.g., austin_lifestyler_marts"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={dialogMode === 'add' ? handleAddClient : handleUpdateClient} 
              variant="contained" 
              color="primary"
              disabled={!clientForm.client_name || !clientForm.bigquery_dataset}
            >
              {dialogMode === 'add' ? 'Add Client' : 'Update Client'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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