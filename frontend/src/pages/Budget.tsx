import { useState, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogFooter } from '../components/ui/Dialog';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import {
  useBudgetStore,
  Transaction,
  Budget as BudgetType,
  TransactionCategory,
  TransactionType,
  TRANSACTION_CATEGORIES,
} from '../store/budgetStore';
import { useVendorStore } from '../store/vendorStore';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Edit,
  Trash2,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet,
  Target,
  AlertCircle,
} from 'lucide-react';

type ViewMode = 'transactions' | 'budgets' | 'analytics';
type TimeFilter = 'month' | 'quarter' | 'year' | 'all';

export default function Budget() {
  const toast = useToast();
  const confirm = useConfirm();
  const { vendors } = useVendorStore();
  const {
    transactions,
    budgets,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBudget,
    updateBudget,
    deleteBudget,
    getSummary,
    getBudgetProgress,
    getMonthlyTrend,
    getCategoryBreakdown,
  } = useBudgetStore();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');

  // Modal state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);

  // Form state
  const [transactionForm, setTransactionForm] = useState<Partial<Transaction>>({
    type: 'expense',
    category: 'maintenance',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    tags: [],
    isRecurring: false,
  });

  const [budgetForm, setBudgetForm] = useState<Partial<BudgetType>>({
    name: '',
    category: 'maintenance',
    plannedAmount: 0,
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Calculate date range based on time filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (timeFilter) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(2020, 0, 1);
        break;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  }, [timeFilter]);

  // Get summary for current period
  const summary = useMemo(() => {
    return getSummary(dateRange.start, dateRange.end);
  }, [dateRange, getSummary, transactions]);

  // Get monthly trend
  const monthlyTrend = useMemo(() => {
    return getMonthlyTrend(6);
  }, [getMonthlyTrend, transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const inDateRange = t.date >= dateRange.start && t.date <= dateRange.end;
      const matchesSearch =
        !searchQuery ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      return inDateRange && matchesSearch && matchesCategory && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, dateRange, searchQuery, categoryFilter, typeFilter]);

  // Handlers
  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setTransactionForm({
      type: 'expense',
      category: 'maintenance',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      tags: [],
      isRecurring: false,
    });
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleSaveTransaction = () => {
    if (!transactionForm.description || !transactionForm.amount) {
      toast.error('Missing fields', 'Please fill in description and amount');
      return;
    }

    const transaction: Transaction = {
      id: editingTransaction?.id || `txn-${Date.now()}`,
      type: transactionForm.type || 'expense',
      category: transactionForm.category || 'other',
      amount: Number(transactionForm.amount),
      description: transactionForm.description || '',
      date: transactionForm.date || new Date().toISOString().split('T')[0],
      vendor: transactionForm.vendor,
      projectId: transactionForm.projectId,
      itemId: transactionForm.itemId,
      notes: transactionForm.notes,
      tags: transactionForm.tags || [],
      isRecurring: transactionForm.isRecurring || false,
      recurrence: transactionForm.recurrence,
    };

    if (editingTransaction) {
      updateTransaction(transaction.id, transaction);
      toast.success('Updated', 'Transaction updated successfully');
    } else {
      addTransaction(transaction);
      toast.success('Added', 'Transaction added successfully');
    }

    setIsTransactionModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      deleteTransaction(id);
      toast.success('Deleted', 'Transaction deleted');
    }
  };

  const handleAddBudget = () => {
    setEditingBudget(null);
    setBudgetForm({
      name: '',
      category: 'maintenance',
      plannedAmount: 0,
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
    setIsBudgetModalOpen(true);
  };

  const handleEditBudget = (budget: BudgetType) => {
    setEditingBudget(budget);
    setBudgetForm(budget);
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = () => {
    if (!budgetForm.name || !budgetForm.plannedAmount) {
      toast.error('Missing fields', 'Please fill in name and amount');
      return;
    }

    const budget: BudgetType = {
      id: editingBudget?.id || `budget-${Date.now()}`,
      name: budgetForm.name || '',
      category: budgetForm.category || 'other',
      plannedAmount: Number(budgetForm.plannedAmount),
      period: budgetForm.period || 'monthly',
      startDate: budgetForm.startDate || new Date().toISOString().split('T')[0],
      notes: budgetForm.notes,
    };

    if (editingBudget) {
      updateBudget(budget.id, budget);
      toast.success('Updated', 'Budget updated successfully');
    } else {
      addBudget(budget);
      toast.success('Added', 'Budget added successfully');
    }

    setIsBudgetModalOpen(false);
  };

  const handleDeleteBudget = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Budget',
      message: 'Are you sure you want to delete this budget?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      deleteBudget(id);
      toast.success('Deleted', 'Budget deleted');
    }
  };

  const getCategoryLabel = (category: TransactionCategory): string => {
    return TRANSACTION_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  // Render summary cards
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Income</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalIncome)}</p>
            </div>
            <ArrowUpRight className="w-8 h-8 opacity-80" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <ArrowDownRight className="w-8 h-8 opacity-80" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(
        "bg-gradient-to-br text-white",
        summary.netCashFlow >= 0 ? "from-blue-500 to-blue-600" : "from-orange-500 to-orange-600"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Net Cash Flow</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.netCashFlow)}</p>
            </div>
            {summary.netCashFlow >= 0 ? (
              <TrendingUp className="w-8 h-8 opacity-80" />
            ) : (
              <TrendingDown className="w-8 h-8 opacity-80" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Transactions</p>
              <p className="text-2xl font-bold">{filteredTransactions.length}</p>
            </div>
            <Wallet className="w-8 h-8 opacity-80" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render transactions list
  const renderTransactionsList = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TransactionCategory | 'all')}
          options={[
            { value: 'all', label: 'All Categories' },
            ...TRANSACTION_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ]}
        />
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
              <Button className="mt-4" onClick={handleAddTransaction}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    transaction.type === 'income'
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                      : "bg-red-100 dark:bg-red-900/30 text-red-600"
                  )}>
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {transaction.description}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getCategoryLabel(transaction.category)}</span>
                      {transaction.vendor && (
                        <>
                          <span>•</span>
                          <span>{transaction.vendor}</span>
                        </>
                      )}
                      {transaction.isRecurring && (
                        <>
                          <span>•</span>
                          <RefreshCw className="w-3 h-3" />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      "font-semibold",
                      transaction.type === 'income' ? "text-green-600" : "text-red-600"
                    )}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.date)}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  // Render budgets list
  const renderBudgetsList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Budget Goals</h3>
        <Button onClick={handleAddBudget}>
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No budgets set up yet</p>
            <Button className="mt-4" onClick={handleAddBudget}>
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => {
            const progress = getBudgetProgress(budget.id);
            const isOverBudget = progress.percentage > 100;

            return (
              <Card key={budget.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{budget.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getCategoryLabel(budget.category)} • {budget.period}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBudget(budget)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBudget(budget.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(progress.spent)} of {formatCurrency(budget.plannedAmount)}
                      </span>
                      <span className={cn(
                        "font-medium",
                        isOverBudget ? "text-red-600" : "text-green-600"
                      )}>
                        {progress.percentage}%
                      </span>
                    </div>

                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          isOverBudget ? "bg-red-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(100, progress.percentage)}%` }}
                      />
                    </div>

                    {isOverBudget && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Over budget by {formatCurrency(progress.spent - budget.plannedAmount)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render analytics
  const renderAnalytics = () => {
    const expenseBreakdown = getCategoryBreakdown('expense', dateRange.start, dateRange.end);

    return (
      <div className="space-y-6">
        {/* Monthly Trend */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              <BarChart3 className="w-5 h-5 inline mr-2" />
              Monthly Trend (Last 6 Months)
            </h3>
            <div className="space-y-3">
              {monthlyTrend.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-muted-foreground">{month.month}</span>
                  <div className="flex-1 flex gap-2">
                    <div
                      className="h-6 bg-green-500 rounded"
                      style={{
                        width: `${Math.min(100, (month.income / Math.max(...monthlyTrend.map((m) => m.income + m.expenses), 1)) * 100)}%`,
                      }}
                    />
                    <div
                      className="h-6 bg-red-500 rounded"
                      style={{
                        width: `${Math.min(100, (month.expenses / Math.max(...monthlyTrend.map((m) => m.income + m.expenses), 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-32 text-right text-sm">
                    <span className="text-green-600">{formatCurrency(month.income)}</span>
                    {' / '}
                    <span className="text-red-600">{formatCurrency(month.expenses)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              <PieChart className="w-5 h-5 inline mr-2" />
              Expense Breakdown
            </h3>
            {expenseBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No expenses in this period
              </p>
            ) : (
              <div className="space-y-3">
                {expenseBreakdown.map((item) => (
                  <div key={item.category} className="flex items-center gap-4">
                    <span className="w-32 text-sm font-medium">
                      {getCategoryLabel(item.category)}
                    </span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="w-12 text-right text-sm text-muted-foreground">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget & Finance</h1>
          <p className="text-muted-foreground">Track income, expenses, and budgets</p>
        </div>

        <div className="flex gap-2">
          <Select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            options={[
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' },
              { value: 'all', label: 'All Time' },
            ]}
          />
          <Button onClick={handleAddTransaction}>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* View Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          className={cn(
            "px-4 py-2 font-medium transition-colors border-b-2 -mb-px",
            viewMode === 'transactions'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setViewMode('transactions')}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          Transactions
        </button>
        <button
          className={cn(
            "px-4 py-2 font-medium transition-colors border-b-2 -mb-px",
            viewMode === 'budgets'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setViewMode('budgets')}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Budgets
        </button>
        <button
          className={cn(
            "px-4 py-2 font-medium transition-colors border-b-2 -mb-px",
            viewMode === 'analytics'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setViewMode('analytics')}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Analytics
        </button>
      </div>

      {/* Content */}
      {viewMode === 'transactions' && renderTransactionsList()}
      {viewMode === 'budgets' && renderBudgetsList()}
      {viewMode === 'analytics' && renderAnalytics()}

      {/* Transaction Modal */}
      <Dialog
        open={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={transactionForm.type || 'expense'}
              onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as TransactionType })}
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
            <Select
              label="Category"
              value={transactionForm.category || 'maintenance'}
              onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value as TransactionCategory })}
              options={TRANSACTION_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
          </div>

          <Input
            label="Description"
            value={transactionForm.description || ''}
            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
            placeholder="What was this for?"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              value={transactionForm.amount || ''}
              onChange={(e) => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })}
              placeholder="0.00"
            />
            <Input
              label="Date"
              type="date"
              value={transactionForm.date || ''}
              onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
            />
          </div>

          <Select
            label="Vendor (optional)"
            value={transactionForm.vendor || ''}
            onChange={(e) => setTransactionForm({ ...transactionForm, vendor: e.target.value })}
            options={[
              { value: '', label: 'Select vendor...' },
              ...vendors.map((v) => ({ value: v.businessName, label: v.businessName })),
            ]}
          />

          <Textarea
            label="Notes (optional)"
            value={transactionForm.notes || ''}
            onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
            placeholder="Additional details..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTransactionModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveTransaction}>
            {editingTransaction ? 'Update' : 'Add'} Transaction
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Budget Modal */}
      <Dialog
        open={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title={editingBudget ? 'Edit Budget' : 'Add Budget'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Budget Name"
            value={budgetForm.name || ''}
            onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
            placeholder="e.g., Monthly Maintenance"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={budgetForm.category || 'maintenance'}
              onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value as TransactionCategory })}
              options={TRANSACTION_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
            <Select
              label="Period"
              value={budgetForm.period || 'monthly'}
              onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value as BudgetType['period'] })}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          </div>

          <Input
            label="Planned Amount"
            type="number"
            value={budgetForm.plannedAmount || ''}
            onChange={(e) => setBudgetForm({ ...budgetForm, plannedAmount: Number(e.target.value) })}
            placeholder="0.00"
          />

          <Textarea
            label="Notes (optional)"
            value={budgetForm.notes || ''}
            onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
            placeholder="Budget notes..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsBudgetModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveBudget}>
            {editingBudget ? 'Update' : 'Create'} Budget
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
