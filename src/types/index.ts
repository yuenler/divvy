export interface ExpenseItem {
  name: string;
  price: number;
  assignedTo: 'Yuen Ler' | 'Haoming' | 'Both';
}

export interface Expense {
  id: string;
  timestamp: Date;
  totalAmount: number;
  items: ExpenseItem[];
  customNotes: string;
  submittedBy: 'Yuen Ler' | 'Haoming';
}

export interface Payment {
  id: string;
  timestamp: Date;
  amount: number;
  from: 'Yuen Ler' | 'Haoming';
  to: 'Yuen Ler' | 'Haoming';
  method: 'venmo' | 'zelle' | 'manual';
  relatedExpenses: string[]; // expense IDs
}

export interface Balance {
  yuenLerOwes: number;
  haomingOwes: number;
}

export interface ReceiptAnalysis {
  items: Array<{
    name: string;
    price: number;
  }>;
  total: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
}
