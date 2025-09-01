import { Expense, Payment, Balance } from '../types';

export const calculateBalance = (expenses: Expense[], payments: Payment[]): Balance => {
  let yuenLerTotal = 0;
  let haomingTotal = 0;

  // Calculate from expenses
  expenses.forEach(expense => {
    expense.items.forEach(item => {
      const amount = item.assignedTo === 'Both' ? item.price / 2 : item.price;
      
      if (item.assignedTo === 'Yuen Ler' || item.assignedTo === 'Both') {
        yuenLerTotal += amount;
      }
      if (item.assignedTo === 'Haoming' || item.assignedTo === 'Both') {
        haomingTotal += amount;
      }
    });
  });

  // Subtract payments
  payments.forEach(payment => {
    if (payment.from === 'Yuen Ler' && payment.to === 'Haoming') {
      yuenLerTotal -= payment.amount;
      haomingTotal += payment.amount;
    } else if (payment.from === 'Haoming' && payment.to === 'Yuen Ler') {
      haomingTotal -= payment.amount;
      yuenLerTotal += payment.amount;
    }
  });

  return {
    yuenLerOwes: Math.max(0, yuenLerTotal - haomingTotal),
    haomingOwes: Math.max(0, haomingTotal - yuenLerTotal)
  };
};

export const getNetBalance = (balance: Balance): number => {
  return balance.yuenLerOwes - balance.haomingOwes;
};

export const isBalanced = (balance: Balance): boolean => {
  return Math.abs(getNetBalance(balance)) < 0.01;
};
