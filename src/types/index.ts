export interface ExpenseItem {
  rawName: string; // exact text from receipt
  displayName: string; // human readable name, editable
  price: number;
  assignedTo: 'Yuen Ler' | 'Haoming' | 'Split';
  suggestedAssignee?: 'Yuen Ler' | 'Haoming' | 'Split';
}

export interface Expense {
  id: string;
  timestamp: Date;
  totalAmount: number;
  items: ExpenseItem[];
  customNotes: string;
  submittedBy: 'Yuen Ler' | 'Haoming';
  store?: string; // e.g., Costco, Trader Joe's
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
    rawName: string;
    displayName: string;
    price: number;
    suggestedAssignee?: 'Yuen Ler' | 'Haoming' | 'Split';
  }>;
  total: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  store?: string;
}
