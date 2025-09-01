import { Expense, Payment, Balance } from '../types';

export const calculateBalance = (expenses: Expense[], payments: Payment[]): Balance => {
  let yuenLerOwedByHaoming = 0; // how much Haoming owes Yuen Ler
  let haomingOwedByYuenLer = 0; // how much Yuen Ler owes Haoming

  // Each expense: submittedBy is the payer. Other person owes based on assignment
  expenses.forEach(expense => {
    const payer = expense.submittedBy;
    const other = payer === 'Yuen Ler' ? 'Haoming' : 'Yuen Ler';
    let otherOwes = 0;
    expense.items.forEach(item => {
      if (item.assignedTo === 'Split') {
        otherOwes += item.price / 2;
      } else if (item.assignedTo === other) {
        otherOwes += item.price;
      }
    });

    if (payer === 'Yuen Ler') {
      yuenLerOwedByHaoming += otherOwes;
    } else {
      haomingOwedByYuenLer += otherOwes;
    }
  });

  // Apply payments
  payments.forEach(payment => {
    if (payment.from === 'Yuen Ler' && payment.to === 'Haoming') {
      // Yuen Ler paid Haoming -> reduces what Haoming owes Yuen Ler (i.e., negative for yuenLerOwedByHaoming)
      yuenLerOwedByHaoming -= payment.amount;
    } else if (payment.from === 'Haoming' && payment.to === 'Yuen Ler') {
      // Haoming paid Yuen Ler -> reduces what Yuen Ler is owed by Haoming
      yuenLerOwedByHaoming -= payment.amount;
    }
  });

  // Convert to the expected Balance shape
  return {
    yuenLerOwes: Math.max(0, haomingOwedByYuenLer),
    haomingOwes: Math.max(0, yuenLerOwedByHaoming)
  };
};

export const getNetBalance = (balance: Balance): number => {
  return balance.yuenLerOwes - balance.haomingOwes;
};

export const isBalanced = (balance: Balance): boolean => {
  return Math.abs(getNetBalance(balance)) < 0.01;
};
