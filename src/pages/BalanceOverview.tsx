import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Smartphone } from 'lucide-react';
import { Expense, Payment, Balance } from '../types';
import { getExpenses, getPayments, addPayment } from '../firebase/services';
import { calculateBalance as calcUtil } from '../utils/balanceCalculator';

export const BalanceOverview: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<Balance>({ yuenLerOwes: 0, haomingOwes: 0 });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<'Yuen Ler' | 'Haoming'>('Yuen Ler');

  useEffect(() => {
    loadData();
    
    // Get current user from localStorage
    const savedSubmitter = localStorage.getItem('expenseSubmitter');
    if (savedSubmitter === 'Yuen Ler' || savedSubmitter === 'Haoming') {
      setCurrentUser(savedSubmitter);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const [expensesData, paymentsData] = await Promise.all([
        getExpenses(),
        getPayments()
      ]);
      
      setExpenses(expensesData);
      setPayments(paymentsData);
      calculateBalance(expensesData, paymentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (expensesData: Expense[], paymentsData: Payment[]) => {
    const b = calcUtil(expensesData, paymentsData);
    setBalance(b);
  };

  const getDateSpanNote = () => {
    if (expenses.length === 0) return 'Divvy settlement';
    
    const sortedExpenses = [...expenses].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const oldestDate = sortedExpenses[0].timestamp;
    const newestDate = sortedExpenses[sortedExpenses.length - 1].timestamp;
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (oldestDate.toDateString() === newestDate.toDateString()) {
      return `Divvy settlement (${formatDate(oldestDate)})`;
    }
    
    return `Divvy settlement (${formatDate(oldestDate)} - ${formatDate(newestDate)})`;
  };

  const handlePayment = async (method: 'venmo' | 'zelle', amount: number, from: 'Yuen Ler' | 'Haoming', to: 'Yuen Ler' | 'Haoming') => {
    try {
      await addPayment({
        timestamp: new Date(),
        amount,
        from,
        to,
        method,
        relatedExpenses: expenses.map(e => e.id)
      });

      // Reload data to update balance
      await loadData();
      
      if (method === 'venmo') {
        const otherUser = currentUser === 'Yuen Ler' ? 'Haoming' : 'Yuen Ler';
        const venmoUsername = otherUser === 'Yuen Ler' ? 'yuenler' : 'h4016506';
        const note = encodeURIComponent(getDateSpanNote());
        
        // Determine transaction type based on who owes whom
        let txnType: 'charge' | 'pay';
        if (currentUser === 'Yuen Ler') {
          // If current user is Yuen Ler: charge when owed, pay when owing
          txnType = netBalance > 0 ? 'charge' : 'pay';
        } else {
          // If current user is Haoming: charge when owed, pay when owing
          txnType = netBalance < 0 ? 'charge' : 'pay';
        }
        
        const venmoUrl = `venmo://paycharge?txn=${txnType}&recipients=${venmoUsername}&amount=${amount}&note=${note}`;
        window.open(venmoUrl, '_blank');
      }
      
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  const handleManualReset = async () => {
    if (window.confirm('This will create a fake payment to settle up all balances. Are you sure?')) {
      try {
        const amount = Math.abs(netBalance);
        const from = netBalance > 0 ? 'Haoming' : 'Yuen Ler';
        const to = netBalance > 0 ? 'Yuen Ler' : 'Haoming';
        
        await addPayment({
          timestamp: new Date(),
          amount,
          from,
          to,
          method: 'manual',
          relatedExpenses: expenses.map(e => e.id)
        });
        
        await loadData();
        alert('Balance manually reset to zero!');
      } catch (error) {
        console.error('Error resetting balance:', error);
        alert('Failed to reset balance. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const netBalance = balance.haomingOwes - balance.yuenLerOwes;
  const isBalanced = Math.abs(netBalance) < 0.01;

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Balance Overview
        </h1>

        <div className="space-y-6">
          {/* Current Balance */}
          <div className="text-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
              isBalanced 
                ? 'bg-green-100 text-green-800' 
                : netBalance > 0 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-orange-100 text-orange-800'
            }`}>
              <DollarSign className="w-5 h-5 mr-2" />
              {isBalanced ? 'All Balanced!' : `${Math.abs(netBalance).toFixed(2)}`}
            </div>
            
            {!isBalanced && (
              <p className="text-sm text-gray-600 mt-2">
                {currentUser === 'Yuen Ler' 
                  ? (netBalance > 0 ? 'Haoming owes you' : 'You owe Haoming')
                  : (netBalance < 0 ? 'Yuen Ler owes you' : 'You owe Yuen Ler')
                }
              </p>
            )}
          </div>

          {/* Individual Balances */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <h3 className="font-semibold text-blue-900 mb-1">Yuen Ler</h3>
              <p className="text-2xl font-bold text-blue-600">
                ${balance.yuenLerOwes.toFixed(2)}
              </p>
              <p className="text-xs text-blue-600">owes</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <h3 className="font-semibold text-orange-900 mb-1">Haoming</h3>
              <p className="text-2xl font-bold text-orange-600">
                ${balance.haomingOwes.toFixed(2)}
              </p>
              <p className="text-xs text-orange-600">owes</p>
            </div>
          </div>

          {/* Payment Options */}
          {!isBalanced && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-center">Settle Up</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => handlePayment('venmo', Math.abs(netBalance), 
                    netBalance > 0 ? 'Haoming' : 'Yuen Ler',
                    netBalance > 0 ? 'Yuen Ler' : 'Haoming'
                  )}
                  className="w-full flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Smartphone className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    {currentUser === 'Yuen Ler' 
                      ? (netBalance > 0 
                          ? `Request $${Math.abs(netBalance).toFixed(2)} from Haoming on Venmo`
                          : `Pay $${Math.abs(netBalance).toFixed(2)} to Haoming on Venmo`
                        )
                      : (netBalance < 0 
                          ? `Request $${Math.abs(netBalance).toFixed(2)} from Yuen Ler on Venmo`
                          : `Pay $${Math.abs(netBalance).toFixed(2)} to Yuen Ler on Venmo`
                        )
                    }
                  </span>
                </button>
                
                <button
                  onClick={() => handlePayment('zelle', Math.abs(netBalance),
                    netBalance > 0 ? 'Haoming' : 'Yuen Ler',
                    netBalance > 0 ? 'Yuen Ler' : 'Haoming'
                  )}
                  className="w-full flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">
                    {currentUser === 'Yuen Ler' 
                      ? (netBalance > 0 
                          ? `Mark $${Math.abs(netBalance).toFixed(2)} received from Haoming (Zelle)`
                          : `Mark $${Math.abs(netBalance).toFixed(2)} paid to Haoming (Zelle)`
                        )
                      : (netBalance < 0 
                          ? `Mark $${Math.abs(netBalance).toFixed(2)} received from Yuen Ler (Zelle)`
                          : `Mark $${Math.abs(netBalance).toFixed(2)} paid to Yuen Ler (Zelle)`
                        )
                    }
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {expenses.slice(0, 3).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Receipt from {expense.submittedBy}
                    </p>
                    <p className="text-xs text-gray-600">
                      {expense.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    ${expense.totalAmount.toFixed(2)}
                  </span>
                </div>
              ))}
              
              {expenses.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No expenses yet. Scan a receipt to get started!
                </p>
              )}
            </div>
          </div>

          {/* Manual Reset Button */}
          {!isBalanced && (
            <div className="border-t pt-4">
              <button
                onClick={handleManualReset}
                className="w-full bg-yellow-50 text-yellow-800 py-3 px-4 rounded-lg font-medium hover:bg-yellow-100 border border-yellow-200"
              >
                🎯 Manually Reset Balance to Zero
              </button>
              <p className="text-xs text-yellow-600 mt-2 text-center">
                Creates a fake payment to settle up all balances
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
