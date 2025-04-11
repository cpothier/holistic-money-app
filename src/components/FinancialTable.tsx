import React, { useState, useEffect } from 'react';
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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Stack,
  alpha,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Comment as CommentIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { FinancialData, FinancialComment } from '../interfaces/FinancialData';
import { getFinancialData, getComments, addComment, updateComment, deleteComment, fetchClients, Client } from '../services/api_new';

// Define theme colors based on holistic-money.com
const THEME_COLORS = {
  primary: '#FFA48A', // Salmon/peach pink
  primaryLight: '#FFD0C2', // Lighter peach shade
  primaryDark: '#D86E55', // Darker peach for better text contrast
  secondary: '#70A288', // Soft green - complementary
  secondaryDark: '#4A7D65', // Darker green for better text contrast
  dark: '#404040',    // Dark gray for text
  light: '#FFFFFF',   // White for backgrounds
  lightGreen: '#E8F5E9', // Light green for positive indicators
  lightRed: '#FFEBEE',   // Light red for negative indicators
};

// Define income/revenue categories - any parent_account that contains these words is considered income
const INCOME_CATEGORIES = ['Income', 'Revenue', 'Sales'];

// Interface for grouped financial data
interface GroupedFinancialData {
  category: string;
  items: FinancialData[];
  subtotalActual: number;
  subtotalBudget: number;
}

const FinancialTable: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedFinancialData[]>([]);
  const [totalActual, setTotalActual] = useState<number>(0);
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // Current month in YYYY-MM format
  );
  const [selectedClient, setSelectedClient] = useState<string>("austin_lifestyler");
  
  // State for clients
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState<boolean>(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  
  // Comment dialog state
  const [commentDialogOpen, setCommentDialogOpen] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [commentId, setCommentId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User'); // In a real app, would come from auth

  // Group financial data by category (parent_account)
  const groupFinancialData = (data: FinancialData[]): GroupedFinancialData[] => {
    // Create a map to group by parent_account
    const groupMap: {[key: string]: GroupedFinancialData} = {};

    // Group items by parent_account
    data.forEach(item => {
      if (!groupMap[item.parent_account]) {
        groupMap[item.parent_account] = {
          category: item.parent_account,
          items: [],
          subtotalActual: 0,
          subtotalBudget: 0
        };
      }

      // Add the item directly without reformatting txnDate
      groupMap[item.parent_account].items.push(item);
      groupMap[item.parent_account].subtotalActual += item.actual;
      groupMap[item.parent_account].subtotalBudget += item.budget_amount;
    });

    // Sort items in each group by ordering_id
    Object.values(groupMap).forEach(group => {
      group.items.sort((a, b) => {
        // Handle numeric ordering_ids
        const aNum = parseInt(a.ordering_id, 10);
        const bNum = parseInt(b.ordering_id, 10);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        // Fall back to string comparison
        return a.ordering_id.localeCompare(b.ordering_id);
      });
    });

    // Convert map to array, sort groups by first item's ordering_id in each group
    const groupedArray = Object.values(groupMap);
    
    // Sort groups based on the first item's ordering_id in each group
    groupedArray.sort((a, b) => {
      if (a.items.length === 0 || b.items.length === 0) return 0;
      const aNum = parseInt(a.items[0].ordering_id, 10);
      const bNum = parseInt(b.items[0].ordering_id, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.items[0].ordering_id.localeCompare(b.items[0].ordering_id);
    });

    return groupedArray;
  };
  
  // Function to load financial data
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedClient) {
        setError('No client selected');
        return;
      }

      if (!selectedMonth) {
        setError('No month selected');
        return;
      }

      const response = await getFinancialData(selectedClient, selectedMonth);
      
      // Reset states
      setFinancialData(response.data);
      setTotalActual(response.totalActual);
      setTotalBudget(response.totalBudget);
      
      // Group the data
      const grouped = groupFinancialData(response.data);
      setGroupedData(grouped);
    } catch (error) {
      console.error('Error loading financial data:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to load financial data');
      }
      // Reset states on error
      setFinancialData([]);
      setGroupedData([]);
      setTotalActual(0);
      setTotalBudget(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients from the API
  useEffect(() => {
    const loadClients = async () => {
      try {
        setClientsLoading(true);
        const clientsData = await fetchClients();
        setClients(clientsData);
        
        // If we have clients and the selected client doesn't exist, select the first one
        if (clientsData.length > 0 && !clientsData.some(client => client.client_name === selectedClient)) {
          setSelectedClient(clientsData[0].client_name);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
        setClientsError('Failed to load clients');
      } finally {
        setClientsLoading(false);
      }
    };
    
    loadClients();
  }, []);
  
  // Display names for clients (formatted for better display)
  const getClientDisplayName = (clientName: string): string => {
    // Find the client in our list
    const client = clients.find(c => c.client_name === clientName);
    if (client) {
      // Convert snake_case to Title Case
      return client.client_name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return clientName;
  };
  
  // Fetch financial data
  useEffect(() => {
    loadFinancialData();
  }, [selectedMonth, selectedClient]);
  
  const handleOpenCommentDialog = (entry: FinancialData) => {
    setSelectedEntry(entry.entry_id);
    setCommentText(entry.comment_text || '');
    // We'll use the entry_id for both adding and updating comments
    setCommentId(entry.entry_id);
    setCommentDialogOpen(true);
  };

  const handleCloseCommentDialog = () => {
    setCommentDialogOpen(false);
    setSelectedEntry(null);
    setCommentText('');
    setCommentId(null);
  };

  const handleAddComment = async () => {
    try {
      if (!selectedEntry) return;
      
      // Create a new comment record
      await addComment(selectedEntry, commentText, selectedClient);
      
      // Reload data to show the updated comment
      await loadFinancialData();
      
      // Close the dialog
      handleCloseCommentDialog();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleUpdateComment = async () => {
    try {
      if (!commentId || !selectedEntry) return;
      
      await updateComment(selectedEntry, commentText, selectedClient);
      
      // Reload data to show the updated comment
      await loadFinancialData();
      
      // Close the dialog
      handleCloseCommentDialog();
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (entryId: string) => {
    try {
      await deleteComment(entryId, selectedClient);
      await loadFinancialData();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Helper function to determine if an account is an income category
  const isIncomeCategory = (accountName: string): boolean => {
    return INCOME_CATEGORIES.some(category => 
      accountName.toLowerCase().includes(category.toLowerCase())
    );
  };

  // Calculate variance and percentage
  const calculateVariance = (actual: number, budget: number) => {
    return actual - budget;
  };

  const calculateVariancePercentage = (actual: number, budget: number) => {
    if (budget === 0) return 0;
    return ((actual - budget) / budget) * 100;
  };

  // Determine color based on variance and account type
  const getVarianceColor = (variance: number, accountName: string): string => {
    const isIncome = isIncomeCategory(accountName);
    
    // For income/revenue: positive variance is good
    // For expenses: negative variance is good
    if (isIncome) {
      return variance >= 0 ? THEME_COLORS.secondaryDark : THEME_COLORS.primaryDark;
    } else {
      return variance <= 0 ? THEME_COLORS.secondaryDark : THEME_COLORS.primaryDark;
    }
  };

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  // Format variance display with icon
  const getVarianceDisplay = (
    variance: number, 
    variancePercentage: number, 
    color: string,
    isTotal: boolean = false
  ) => {
    const isPositive = variance >= 0;
    
    return (
      <Stack 
        direction="row" 
        spacing={1} 
        alignItems="center" 
        justifyContent="flex-end"
        sx={{ 
          color, 
          fontWeight: isTotal ? 600 : 500,
          backgroundColor: isPositive ? 
            alpha(THEME_COLORS.secondary, 0.1) : 
            alpha(THEME_COLORS.primary, 0.1),
          borderRadius: 1,
          px: 1,
          py: 0.5,
          display: 'inline-flex',
          width: 'fit-content',
          ml: 'auto'
        }}
      >
        {isPositive ? 
          <TrendingUpIcon fontSize={isTotal ? "small" : "inherit"} /> : 
          <TrendingDownIcon fontSize={isTotal ? "small" : "inherit"} />
        }
        <Box>
          {formatCurrency(variance)}
          <Typography 
            variant="caption" 
            component="div" 
            sx={{ color, opacity: 0.9 }}
          >
            {formatPercentage(variancePercentage)}
          </Typography>
        </Box>
      </Stack>
    );
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Typography variant="h6">Loading financial data...</Typography>
    </Box>
  );
  
  if (error) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <Typography variant="h6" color="error">{error}</Typography>
    </Box>
  );

  // Parse the selected month correctly
  const [year, month] = selectedMonth.split('-').map(Number);
  
  // Create a date object with the correct year and month
  // JavaScript months are 0-indexed, so we subtract 1 from the month
  const date = new Date(year, month - 1, 1);
  
  // Format the month and year correctly
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Use the parsed values directly to avoid any date object issues
  const formattedMonth = `${monthNames[month - 1]} ${year}`;

  return (
    <Box sx={{ mx: 2, my: 3 }}>
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${alpha(THEME_COLORS.primary, 0.3)}`,
        pb: 2
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            color: THEME_COLORS.primary
          }}
        >
          Financial Statement • {getClientDisplayName(selectedClient)} • {formattedMonth}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200, width: 200 }}>
            <InputLabel id="client-select-label">Client</InputLabel>
            <Select
              labelId="client-select-label"
              value={selectedClient}
              label="Client"
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={clientsLoading}
              size="small"
              sx={{ 
                bgcolor: 'white',
                height: 40,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: 2,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: THEME_COLORS.primary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: THEME_COLORS.primary,
                }
              }}
            >
              {clientsLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading clients...
                </MenuItem>
              ) : clientsError ? (
                <MenuItem disabled>Error loading clients</MenuItem>
              ) : clients.length === 0 ? (
                <MenuItem disabled>No clients available</MenuItem>
              ) : (
                clients.map((client) => (
                  <MenuItem key={client.client_id} value={client.client_name}>
                    {getClientDisplayName(client.client_name)}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <TextField
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            label="Select Month"
            variant="outlined"
            size="small"
            sx={{ 
              width: 200,
              height: 40,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                height: 40,
                '&.Mui-focused fieldset': {
                  borderColor: THEME_COLORS.primary,
                }
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: THEME_COLORS.primary
              }
            }}
          />
        </Box>
      </Box>

      <TableContainer 
        component={Paper} 
        elevation={2}
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              background: THEME_COLORS.primary,
            }}>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Account</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Subaccount</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600 }}>Child Account</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actual</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Budget</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Variance</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Comments</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Render by group with subtotals */}
            {groupedData.map((group, groupIndex) => {
              // Calculate group variance
              const groupVariance = calculateVariance(group.subtotalActual, group.subtotalBudget);
              const groupVariancePercentage = calculateVariancePercentage(group.subtotalActual, group.subtotalBudget);
              const groupVarianceColor = getVarianceColor(groupVariance, group.category);
              const isIncomeGroup = isIncomeCategory(group.category);
              
              // Determine group header background color based on category type
              const groupHeaderBgColor = isIncomeGroup ? 
                alpha(THEME_COLORS.secondary, 0.08) : // Light green for income
                alpha(THEME_COLORS.primary, 0.04);    // Very light peach for expenses
              
              return (
                <React.Fragment key={group.category}>
                  {/* Group header row */}
                  <TableRow sx={{ backgroundColor: groupHeaderBgColor }}>
                    <TableCell 
                      colSpan={8} 
                      sx={{ 
                        py: 1.5, 
                        fontWeight: 600,
                        fontSize: '1rem',
                        color: isIncomeGroup ? THEME_COLORS.secondary : THEME_COLORS.primary
                      }}
                    >
                      {group.category}
                    </TableCell>
                  </TableRow>
                  
                  {/* Render group items */}
                  {group.items.map((row, index) => {
                    const variance = calculateVariance(row.actual, row.budget_amount);
                    const variancePercentage = calculateVariancePercentage(row.actual, row.budget_amount);
                    const varianceColor = getVarianceColor(variance, row.parent_account);
                    const hasComment = !!row.comment_text;
                    
                    return (
                      <TableRow 
                        key={row.entry_id}
                        sx={{ 
                          '&:nth-of-type(odd)': { 
                            backgroundColor: alpha('#f5f5f5', 0.5) 
                          },
                          '&:hover': {
                            backgroundColor: alpha(THEME_COLORS.primary, 0.05)
                          }
                        }}
                      >
                        <TableCell>{row.parent_account}</TableCell>
                        <TableCell>{row.sub_account || '—'}</TableCell>
                        <TableCell>{row.child_account || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, color: THEME_COLORS.dark }}>
                          {formatCurrency(row.actual)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, color: THEME_COLORS.dark }}>
                          {formatCurrency(row.budget_amount)}
                        </TableCell>
                        <TableCell align="right">
                          {getVarianceDisplay(variance, variancePercentage, varianceColor)}
                        </TableCell>
                        <TableCell align="right">
                          {hasComment ? (
                            <Chip
                              size="small"
                              icon={<CommentIcon fontSize="small" />}
                              label={row.comment_text}
                              variant="outlined"
                              color="primary"
                              sx={{ 
                                maxWidth: 150, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                cursor: 'pointer',
                                fontWeight: 400,
                                fontSize: '0.75rem',
                                borderColor: THEME_COLORS.primary,
                                color: THEME_COLORS.dark
                              }}
                              onClick={() => handleOpenCommentDialog(row)}
                            />
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenCommentDialog(row)}
                            title={hasComment ? "Edit comment" : "Add comment"}
                            sx={{ 
                              bgcolor: alpha(THEME_COLORS.primary, 0.1),
                              color: THEME_COLORS.primary,
                              '&:hover': {
                                bgcolor: alpha(THEME_COLORS.primary, 0.2)
                              }
                            }}
                          >
                            {hasComment ? (
                              <EditIcon fontSize="small" />
                            ) : (
                              <AddIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Subtotal row for the group */}
                  <TableRow 
                    sx={{ 
                      backgroundColor: alpha(isIncomeGroup ? THEME_COLORS.secondary : THEME_COLORS.primary, 0.15),
                      fontWeight: 600,
                      borderTop: '1px solid #e0e0e0',
                      borderBottom: '1px solid #e0e0e0',
                      '& .MuiTableCell-root': {
                        py: 1.5,
                        color: isIncomeGroup ? THEME_COLORS.secondaryDark : THEME_COLORS.primaryDark,
                      }
                    }}
                  >
                    <TableCell 
                      colSpan={3}
                      sx={{ fontWeight: 600 }}
                    >
                      Total {group.category}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(group.subtotalActual)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(group.subtotalBudget)}
                    </TableCell>
                    <TableCell align="right">
                      {getVarianceDisplay(
                        groupVariance, 
                        groupVariancePercentage, 
                        groupVarianceColor,
                        true
                      )}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                  
                  {/* Spacing between groups (except for the last group) */}
                  {groupIndex < groupedData.length - 1 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ height: 10, p: 0, border: 0 }} />
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
            
            {/* Grand Total row */}
            <TableRow sx={{ 
              fontWeight: 700,
              backgroundColor: alpha(THEME_COLORS.primary, 0.1),
              borderTop: `2px solid ${THEME_COLORS.primary}`,
              borderBottom: `2px solid ${THEME_COLORS.primary}`,
              '& .MuiTableCell-root': {
                fontSize: '1.1rem',
                py: 2
              }
            }}>
              <TableCell 
                colSpan={3}
                sx={{ 
                  fontWeight: 700,
                  color: THEME_COLORS.primaryDark
                }}
              >
                GRAND TOTAL
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  fontWeight: 700,
                  color: THEME_COLORS.dark
                }}
              >
                {formatCurrency(totalActual)}
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  fontWeight: 700,
                  color: THEME_COLORS.dark
                }}
              >
                {formatCurrency(totalBudget)}
              </TableCell>
              <TableCell align="right">
                {getVarianceDisplay(
                  totalActual - totalBudget,
                  calculateVariancePercentage(totalActual, totalBudget),
                  totalActual >= totalBudget ? THEME_COLORS.secondaryDark : THEME_COLORS.primaryDark,
                  true
                )}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Comment Dialog */}
      <Dialog 
        open={commentDialogOpen} 
        onClose={handleCloseCommentDialog}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 400
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: '1px solid #e0e0e0',
          background: THEME_COLORS.primary,
          color: 'white',
          fontWeight: 600
        }}>
          {commentId && commentText ? 'Edit Comment' : 'Add Comment'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={4}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            variant="outlined"
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                '&.Mui-focused fieldset': {
                  borderColor: THEME_COLORS.primary,
                }
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: THEME_COLORS.primary
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCloseCommentDialog}
            variant="outlined"
            sx={{ 
              borderRadius: 2, 
              borderColor: THEME_COLORS.primary,
              color: THEME_COLORS.primary,
              '&:hover': {
                borderColor: THEME_COLORS.primary,
                backgroundColor: alpha(THEME_COLORS.primary, 0.04)
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={commentId ? handleUpdateComment : handleAddComment} 
            variant="contained"
            sx={{ 
              bgcolor: THEME_COLORS.primary,
              '&:hover': {
                bgcolor: THEME_COLORS.primaryDark,
              },
            }}
          >
            {commentId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialTable; 