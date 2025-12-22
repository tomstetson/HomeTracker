import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

// ============================================================================
// Types
// ============================================================================

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 
  | 'maintenance' 
  | 'repair' 
  | 'improvement' 
  | 'utility' 
  | 'insurance' 
  | 'tax' 
  | 'mortgage'
  | 'hoa'
  | 'rental_income'
  | 'other';

export type RecurrenceInterval = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'none';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string; // ISO date string
  vendor?: string; // Link to vendor
  projectId?: string; // Link to project
  itemId?: string; // Link to inventory item
  receiptDocumentId?: string; // Link to document
  notes?: string;
  tags: string[];
  isRecurring: boolean;
  recurrence?: {
    interval: RecurrenceInterval;
    nextDate?: string;
    endDate?: string;
  };
}

export interface Budget {
  id: string;
  name: string;
  category: TransactionCategory;
  plannedAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface BudgetSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  byCategory: Record<TransactionCategory, { income: number; expenses: number }>;
}

// ============================================================================
// Default Data
// ============================================================================

export const TRANSACTION_CATEGORIES: { value: TransactionCategory; label: string; icon: string }[] = [
  { value: 'maintenance', label: 'Maintenance', icon: 'Wrench' },
  { value: 'repair', label: 'Repair', icon: 'Hammer' },
  { value: 'improvement', label: 'Home Improvement', icon: 'Home' },
  { value: 'utility', label: 'Utility', icon: 'Zap' },
  { value: 'insurance', label: 'Insurance', icon: 'Shield' },
  { value: 'tax', label: 'Property Tax', icon: 'FileText' },
  { value: 'mortgage', label: 'Mortgage/Rent', icon: 'Building' },
  { value: 'hoa', label: 'HOA Fees', icon: 'Users' },
  { value: 'rental_income', label: 'Rental Income', icon: 'DollarSign' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    category: 'utility',
    amount: 150,
    description: 'Electric Bill - December',
    date: '2024-12-01',
    isRecurring: true,
    recurrence: { interval: 'monthly', nextDate: '2025-01-01' },
    tags: ['utility', 'electric'],
  },
  {
    id: '2',
    type: 'expense',
    category: 'maintenance',
    amount: 250,
    description: 'HVAC Filter Replacement & Inspection',
    date: '2024-11-15',
    vendor: 'Cool Air HVAC',
    isRecurring: false,
    tags: ['hvac', 'maintenance'],
  },
  {
    id: '3',
    type: 'expense',
    category: 'mortgage',
    amount: 2100,
    description: 'Mortgage Payment',
    date: '2024-12-01',
    isRecurring: true,
    recurrence: { interval: 'monthly', nextDate: '2025-01-01' },
    tags: ['mortgage'],
  },
  {
    id: '4',
    type: 'expense',
    category: 'insurance',
    amount: 1800,
    description: 'Homeowners Insurance - Annual',
    date: '2024-06-01',
    isRecurring: true,
    recurrence: { interval: 'yearly', nextDate: '2025-06-01' },
    tags: ['insurance'],
  },
];

const DEFAULT_BUDGETS: Budget[] = [
  {
    id: '1',
    name: 'Monthly Maintenance',
    category: 'maintenance',
    plannedAmount: 500,
    period: 'monthly',
    startDate: '2024-01-01',
  },
  {
    id: '2',
    name: 'Annual Home Improvement',
    category: 'improvement',
    plannedAmount: 10000,
    period: 'yearly',
    startDate: '2024-01-01',
  },
  {
    id: '3',
    name: 'Monthly Utilities',
    category: 'utility',
    plannedAmount: 400,
    period: 'monthly',
    startDate: '2024-01-01',
  },
];

// ============================================================================
// Store Interface
// ============================================================================

interface BudgetStore {
  transactions: Transaction[];
  budgets: Budget[];
  isLoading: boolean;
  
  // Transaction CRUD
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Budget CRUD
  setBudgets: (budgets: Budget[]) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  
  // Queries
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getTransactionsByCategory: (category: TransactionCategory) => Transaction[];
  getRecurringTransactions: () => Transaction[];
  getUpcomingRecurring: (daysAhead?: number) => Transaction[];
  
  // Summary & Analytics
  getSummary: (startDate: string, endDate: string) => BudgetSummary;
  getBudgetProgress: (budgetId: string) => { spent: number; remaining: number; percentage: number };
  getMonthlyTrend: (months?: number) => { month: string; income: number; expenses: number }[];
  getCategoryBreakdown: (type: TransactionType, startDate?: string, endDate?: string) => { category: TransactionCategory; amount: number; percentage: number }[];
  
  // Storage
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const isInDateRange = (date: string, startDate: string, endDate: string): boolean => {
  const d = new Date(date);
  return d >= new Date(startDate) && d <= new Date(endDate);
};

const getMonthKey = (date: string): string => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  transactions: [],
  budgets: [],
  isLoading: true,
  
  // Transaction CRUD
  setTransactions: (transactions) => {
    set({ transactions });
    get().saveToStorage();
  },
  
  addTransaction: (transaction) => {
    set((state) => ({ transactions: [...state.transactions, transaction] }));
    get().saveToStorage();
  },
  
  updateTransaction: (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    get().saveToStorage();
  },
  
  deleteTransaction: (id) => {
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    get().saveToStorage();
  },
  
  // Budget CRUD
  setBudgets: (budgets) => {
    set({ budgets });
    get().saveToStorage();
  },
  
  addBudget: (budget) => {
    set((state) => ({ budgets: [...state.budgets, budget] }));
    get().saveToStorage();
  },
  
  updateBudget: (id, updates) => {
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    get().saveToStorage();
  },
  
  deleteBudget: (id) => {
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
    get().saveToStorage();
  },
  
  // Queries
  getTransactionsByDateRange: (startDate, endDate) => {
    return get().transactions.filter((t) => isInDateRange(t.date, startDate, endDate));
  },
  
  getTransactionsByCategory: (category) => {
    return get().transactions.filter((t) => t.category === category);
  },
  
  getRecurringTransactions: () => {
    return get().transactions.filter((t) => t.isRecurring);
  },
  
  getUpcomingRecurring: (daysAhead = 30) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    return get().transactions.filter((t) => {
      if (!t.isRecurring || !t.recurrence?.nextDate) return false;
      const nextDate = new Date(t.recurrence.nextDate);
      return nextDate >= today && nextDate <= futureDate;
    });
  },
  
  // Summary & Analytics
  getSummary: (startDate, endDate) => {
    const transactions = get().getTransactionsByDateRange(startDate, endDate);
    
    const summary: BudgetSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      byCategory: {} as Record<TransactionCategory, { income: number; expenses: number }>,
    };
    
    // Initialize all categories
    TRANSACTION_CATEGORIES.forEach(({ value }) => {
      summary.byCategory[value] = { income: 0, expenses: 0 };
    });
    
    // Calculate totals
    transactions.forEach((t) => {
      if (t.type === 'income') {
        summary.totalIncome += t.amount;
        summary.byCategory[t.category].income += t.amount;
      } else {
        summary.totalExpenses += t.amount;
        summary.byCategory[t.category].expenses += t.amount;
      }
    });
    
    summary.netCashFlow = summary.totalIncome - summary.totalExpenses;
    
    return summary;
  },
  
  getBudgetProgress: (budgetId) => {
    const budget = get().budgets.find((b) => b.id === budgetId);
    if (!budget) return { spent: 0, remaining: 0, percentage: 0 };
    
    // Calculate date range based on budget period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (budget.period) {
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    // Get transactions in this category and period
    const transactions = get().transactions.filter((t) => 
      t.category === budget.category &&
      t.type === 'expense' &&
      isInDateRange(t.date, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    );
    
    const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, budget.plannedAmount - spent);
    const percentage = Math.min(100, Math.round((spent / budget.plannedAmount) * 100));
    
    return { spent, remaining, percentage };
  },
  
  getMonthlyTrend: (months = 12) => {
    const result: { month: string; income: number; expenses: number }[] = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = getMonthKey(date.toISOString());
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const transactions = get().getTransactionsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      result.push({
        month: monthKey,
        income,
        expenses,
      });
    }
    
    return result;
  },
  
  getCategoryBreakdown: (type, startDate, endDate) => {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate || now.toISOString().split('T')[0];
    
    const transactions = get().getTransactionsByDateRange(start, end)
      .filter((t) => t.type === type);
    
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const byCategory: Record<TransactionCategory, number> = {} as Record<TransactionCategory, number>;
    TRANSACTION_CATEGORIES.forEach(({ value }) => {
      byCategory[value] = 0;
    });
    
    transactions.forEach((t) => {
      byCategory[t.category] += t.amount;
    });
    
    return Object.entries(byCategory)
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category: category as TransactionCategory,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  },
  
  // Storage
  loadFromStorage: () => {
    try {
      const storedTransactions = getCollection('transactions');
      const storedBudgets = getCollection('budgets');
      
      if ((storedTransactions && storedTransactions.length > 0) || (storedBudgets && storedBudgets.length > 0)) {
        set({ 
          transactions: storedTransactions || [], 
          budgets: storedBudgets || [],
          isLoading: false 
        });
      } else {
        set({ 
          transactions: DEFAULT_TRANSACTIONS, 
          budgets: DEFAULT_BUDGETS,
          isLoading: false 
        });
        get().saveToStorage();
      }
    } catch (error) {
      console.error('Failed to load budget data:', error);
      set({ 
        transactions: DEFAULT_TRANSACTIONS, 
        budgets: DEFAULT_BUDGETS,
        isLoading: false 
      });
    }
  },
  
  saveToStorage: () => {
    try {
      const { transactions, budgets } = get();
      saveCollection('transactions', transactions);
      saveCollection('budgets', budgets);
    } catch (error) {
      console.error('Failed to save budget data:', error);
    }
  },
}));

// Load data on initialization
useBudgetStore.getState().loadFromStorage();
