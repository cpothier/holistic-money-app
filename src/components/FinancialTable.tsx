import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Paper,
  Container,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { getFinancialData, fetchClients, addComment, updateComment, deleteComment } from '../services/api_new';
import { FinancialData } from '../interfaces/FinancialData';
import { Client } from '../services/api_new';
import { Assessment as AssessmentIcon, People as PeopleIcon } from '@mui/icons-material';

// Helper function to get month options
const getMonthOptions = () => {
  const months = [];
  const currentDate = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push({
      value: date.toISOString().split('T')[0].substring(0, 7),
      label: date.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  }
  return months;
};

const isDateObject = (date: unknown): date is { value: string } => {
  return typeof date === 'object' && date !== null && 'value' in date;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const calculateVariance = (actual: number, budget: number) => {
  const amount = actual - budget;
  const percentage = budget !== 0 ? amount / budget : 0;
  return { amount, percentage };
};

// Helper function to format date
const formatDate = (date: string | { value: string }) => {
  const dateStr = typeof date === 'string' ? date : date.value;
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface CommentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (comment: string) => void;
  initialComment?: string;
  mode: 'add' | 'edit';
}

const CommentDialog: React.FC<CommentDialogProps> = ({ open, onClose, onSave, initialComment = '', mode }) => {
  const [comment, setComment] = useState(initialComment);

  useEffect(() => {
    // Reset comment state when dialog opens
    setComment(initialComment);
  }, [open, initialComment]);

  const handleSave = () => {
    onSave(comment);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'add' ? 'Add Comment' : 'Edit Comment'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Comment"
          fullWidth
          multiline
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const FinancialTable: React.FC = () => {
  const [rows, setRows] = useState<FinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('austin_lifestyler');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentDate = new Date();
    return currentDate.toISOString().split('T')[0].substring(0, 7);
  });
  const [commentDialog, setCommentDialog] = useState<{
    open: boolean;
    entryId: string;
    mode: 'add' | 'edit';
    initialComment?: string;
  }>({ open: false, entryId: '', mode: 'add' });

  const monthOptions = getMonthOptions();

  const handleAddComment = (entryId: string) => {
    setCommentDialog({ open: true, entryId, mode: 'add' });
  };

  const handleEditComment = (entryId: string, currentComment: string) => {
    setCommentDialog({ open: true, entryId, mode: 'edit', initialComment: currentComment });
  };

  const handleDeleteComment = async (entryId: string) => {
    if (!entryId) {
      setError('Invalid entry ID');
      return;
    }
    try {
      await deleteComment(entryId, selectedClient);
      // Refresh the data
      const data = await getFinancialData(selectedClient, selectedMonth);
      if (Array.isArray(data)) {
        const processedRows = data.map(row => ({
          ...row,
          actual: Number(row.actual) || 0,
          budget_amount: Number(row.budget_amount) || 0,
          txnDate: isDateObject(row.txnDate) ? row.txnDate.value : (row.txnDate as string) || ''
        }));
        setRows(processedRows);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const handleSaveComment = async (comment: string) => {
    if (!commentDialog.entryId) {
      setError('Invalid entry ID');
      return;
    }
    try {
      if (commentDialog.mode === 'add') {
        await addComment(commentDialog.entryId, comment, selectedClient);
      } else {
        await updateComment(commentDialog.entryId, comment, selectedClient);
      }
      // Refresh the data
      const data = await getFinancialData(selectedClient, selectedMonth);
      if (Array.isArray(data)) {
        const processedRows = data.map(row => ({
          ...row,
          actual: Number(row.actual) || 0,
          budget_amount: Number(row.budget_amount) || 0,
          txnDate: isDateObject(row.txnDate) ? row.txnDate.value : (row.txnDate as string) || ''
        }));
        setRows(processedRows);
      }
    } catch (err) {
      console.error('Error saving comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save comment');
    }
  };

  const fetchActiveClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
      if (data.length > 0 && !selectedClient) {
        setSelectedClient(data[0].client_name);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Failed to fetch clients');
    }
  };

  useEffect(() => {
    fetchActiveClients();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedClient) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await getFinancialData(selectedClient, selectedMonth);
        
        if (!Array.isArray(data)) {
          setError('Invalid data format received');
          return;
        }

        const processedRows = data.map(row => ({
          ...row,
          actual: Number(row.actual) || 0,
          budget_amount: Number(row.budget_amount) || 0,
          txnDate: isDateObject(row.txnDate) ? row.txnDate.value : (row.txnDate as string) || ''
        }));

        setRows(processedRows);
      } catch (err) {
        console.error('Error fetching financial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClient, selectedMonth]);

  // Group rows by parent account
  const groupedRows = rows.reduce((acc: { [key: string]: FinancialData[] }, row) => {
    const parentAccount = row.parent_account;
    if (!acc[parentAccount]) {
      acc[parentAccount] = [];
    }
    acc[parentAccount].push(row);
    return acc;
  }, {});

  // Calculate totals for each parent account
  const parentAccountTotals = Object.entries(groupedRows).reduce((acc: { [key: string]: { actual: number; budget: number } }, [parentAccount, rows]) => {
    acc[parentAccount] = rows.reduce((totals, row) => ({
      actual: totals.actual + row.actual,
      budget: totals.budget + row.budget_amount
    }), { actual: 0, budget: 0 });
    return acc;
  }, {});

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ 
            color: 'primary.main',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <AssessmentIcon fontSize="large" />
            Financial Overview
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Client</InputLabel>
                <Select
                  value={selectedClient}
                  label="Client"
                  onChange={(e) => setSelectedClient(e.target.value)}
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }
                  }}
                >
                  {clients.map((client) => (
                    <MenuItem key={client.client_name} value={client.client_name}>
                      <PeopleIcon fontSize="small" />
                      {client.client_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Month</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Month"
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Parent Account</TableCell>
                  <TableCell>Sub Account</TableCell>
                  <TableCell>Child Account</TableCell>
                  <TableCell align="right">Actual</TableCell>
                  <TableCell align="right">Budget</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell align="center">Comments</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(groupedRows).map(([parentAccount, parentRows]) => (
                  <React.Fragment key={parentAccount}>
                    {/* Parent Account Row */}
                    <TableRow sx={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      '& > td': {
                        paddingTop: 3,
                        paddingBottom: 2
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        transition: 'background-color 0.2s ease'
                      }
                    }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 600 }}>
                        {parentAccount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(parentAccountTotals[parentAccount].actual)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(parentAccountTotals[parentAccount].budget)}
                      </TableCell>
                      <TableCell align="right" sx={{ 
                        fontWeight: 600,
                        color: parentAccountTotals[parentAccount].actual - parentAccountTotals[parentAccount].budget >= 0 ? 'success.main' : 'error.main',
                        fontSize: '0.95rem'
                      }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(parentAccountTotals[parentAccount].actual - parentAccountTotals[parentAccount].budget)}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              opacity: 0.8,
                              fontWeight: 500
                            }}
                          >
                            {formatPercentage((parentAccountTotals[parentAccount].actual - parentAccountTotals[parentAccount].budget) / parentAccountTotals[parentAccount].budget)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {/* Child Rows */}
                    {parentRows.map((row) => (
                      <TableRow 
                        key={row.entry_id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            transition: 'background-color 0.2s ease'
                          }
                        }}
                      >
                        <TableCell />
                        <TableCell>{row.sub_account}</TableCell>
                        <TableCell>{row.child_account}</TableCell>
                        <TableCell align="right">{formatCurrency(row.actual)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.budget_amount)}</TableCell>
                        <TableCell align="right" sx={{ 
                          color: row.actual - row.budget_amount >= 0 ? 'success.main' : 'error.main',
                          fontSize: '0.95rem'
                        }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatCurrency(row.actual - row.budget_amount)}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                opacity: 0.8,
                                fontWeight: 500
                              }}
                            >
                              {formatPercentage((row.actual - row.budget_amount) / row.budget_amount)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 1,
                            minWidth: '200px',
                            maxWidth: '300px'
                          }}>
                            {row.comment_text ? (
                              <>
                                <Paper 
                                  elevation={0}
                                  sx={{ 
                                    p: 1.5,
                                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                  }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      textAlign: 'left',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {row.comment_text}
                                  </Typography>
                                </Paper>
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'flex-end', 
                                  gap: 1,
                                  mt: -0.5
                                }}>
                                  <Tooltip title="Edit Comment">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleEditComment(row.entry_id, row.comment_text || '')}
                                      sx={{ 
                                        color: 'primary.main',
                                        '&:hover': {
                                          backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                        }
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Comment">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleDeleteComment(row.entry_id)}
                                      sx={{ 
                                        color: 'error.main',
                                        '&:hover': {
                                          backgroundColor: 'rgba(211, 47, 47, 0.04)'
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </>
                            ) : (
                              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Tooltip title="Add Comment">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleAddComment(row.entry_id)}
                                    sx={{ 
                                      color: 'primary.main',
                                      '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                      }
                                    }}
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Comment Dialog */}
        <Dialog open={commentDialog.open} onClose={() => setCommentDialog({ ...commentDialog, open: false })}>
          <DialogTitle>
            {commentDialog.mode === 'add' ? 'Add Comment' : 'Edit Comment'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Comment"
              type="text"
              fullWidth
              variant="outlined"
              value={commentDialog.initialComment || ''}
              onChange={(e) => setCommentDialog({ ...commentDialog, initialComment: e.target.value })}
              multiline
              rows={4}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCommentDialog({ ...commentDialog, open: false })}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (commentDialog.initialComment) {
                  handleSaveComment(commentDialog.initialComment);
                  setCommentDialog({ ...commentDialog, open: false });
                }
              }}
              variant="contained"
              color="primary"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
}; 