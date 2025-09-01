import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import { Expense, Payment } from '../types';

// Expense operations
export const addExpense = async (expense: Omit<Expense, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    timestamp: Timestamp.fromDate(expense.timestamp)
  });
  return docRef.id;
};

export const getExpenses = async (): Promise<Expense[]> => {
  const q = query(collection(db, 'expenses'), orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate()
  })) as Expense[];
};

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<void> => {
  const expenseRef = doc(db, 'expenses', id);
  const updateData: any = { ...updates };
  
  if (updates.timestamp) {
    updateData.timestamp = Timestamp.fromDate(updates.timestamp);
  }
  
  await updateDoc(expenseRef, updateData);
};

export const deleteExpense = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', id));
};

export const deletePayment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'payments', id));
};

// Payment operations
export const addPayment = async (payment: Omit<Payment, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'payments'), {
    ...payment,
    timestamp: Timestamp.fromDate(payment.timestamp)
  });
  return docRef.id;
};

export const getPayments = async (): Promise<Payment[]> => {
  const q = query(collection(db, 'payments'), orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate()
  })) as Payment[];
};

// Utility function to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};
