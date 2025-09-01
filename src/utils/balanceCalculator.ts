import { Expense, Payment, Balance } from '../types';

export const calculateBalance = (expenses: Expense[], payments: Payment[]): Balance => {
  let yuenLerOwesHaoming = 0; // how much Yuen Ler owes Haoming
  let haomingOwesYuenLer = 0; // how much Haoming owes Yuen Ler

  // Calculate what each person owes based on expenses
  expenses.forEach(expense => {
    const payer = expense.submittedBy;
    
    expense.items.forEach(item => {
      if (item.assignedTo === 'Split') {
        // Split items: other person owes half
        if (payer === 'Yuen Ler') {
          haomingOwesYuenLer += item.price / 2;
        } else {
          yuenLerOwesHaoming += item.price / 2;
        }
      } else if (item.assignedTo === 'Yuen Ler' && payer === 'Haoming') {
        // Haoming paid for Yuen Ler's item
        yuenLerOwesHaoming += item.price;
      } else if (item.assignedTo === 'Haoming' && payer === 'Yuen Ler') {
        // Yuen Ler paid for Haoming's item
        haomingOwesYuenLer += item.price;
      }
      // If assignedTo === payer, they paid for their own item, no debt created
    });
  });

  // Apply payments to reduce debt
  payments.forEach(payment => {
    if (payment.from === 'Yuen Ler' && payment.to === 'Haoming') {
      // Yuen Ler paid Haoming -> reduces what Yuen Ler owes Haoming
      yuenLerOwesHaoming -= payment.amount;
      // If Yuen Ler overpaid, it becomes debt in the opposite direction
      if (yuenLerOwesHaoming < 0) {
        haomingOwesYuenLer += Math.abs(yuenLerOwesHaoming);
        yuenLerOwesHaoming = 0;
      }
    } else if (payment.from === 'Haoming' && payment.to === 'Yuen Ler') {
      // Haoming paid Yuen Ler -> reduces what Haoming owes Yuen Ler
      haomingOwesYuenLer -= payment.amount;
      // If Haoming overpaid, it becomes debt in the opposite direction
      if (haomingOwesYuenLer < 0) {
        yuenLerOwesHaoming += Math.abs(haomingOwesYuenLer);
        haomingOwesYuenLer = 0;
      }
    }
  });

  // Subtract the smaller from the larger
  if (yuenLerOwesHaoming > haomingOwesYuenLer) {
    yuenLerOwesHaoming -= haomingOwesYuenLer;
    haomingOwesYuenLer = 0;
  } else {
    haomingOwesYuenLer -= yuenLerOwesHaoming;
    yuenLerOwesHaoming = 0;
  }

  return {
    yuenLerOwes: yuenLerOwesHaoming,
    haomingOwes: haomingOwesYuenLer
  };
};

export const getNetBalance = (balance: Balance): number => {
  return balance.yuenLerOwes - balance.haomingOwes;
};

export const isBalanced = (balance: Balance): boolean => {
  return Math.abs(getNetBalance(balance)) < 0.01;
};
