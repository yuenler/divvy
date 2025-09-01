import React, { useState, useEffect } from 'react';
import { Receipt, CreditCard, Eye, EyeOff } from 'lucide-react';
import { Expense, Payment } from '../types';
import { getExpenses, getPayments } from '../firebase/services';

export const History: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesData, paymentsData] = await Promise.all([
        getExpenses(),
        getPayments()
      ]);
      
      setExpenses(expensesData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'venmo':
        return '💚';
      case 'zelle':
        return '💙';
      case 'manual':
        return '✅';
      default:
        return '💳';
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'venmo':
        return 'Venmo';
      case 'zelle':
        return 'Zelle';
      case 'manual':
        return 'Manual';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Combine and sort all activities by date
  const allActivities = [
    ...expenses.map(expense => ({ ...expense, type: 'expense' as const })),
    ...payments.map(payment => ({ ...payment, type: 'payment' as const }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          History
        </h1>

        <div className="space-y-4">
          {allActivities.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No activity yet</p>
              <p className="text-sm text-gray-400">Scan a receipt to get started!</p>
            </div>
          ) : (
            allActivities.map((activity, index) => (
              <div key={`${activity.type}-${activity.id}`} className="border border-gray-200 rounded-lg p-4">
                {activity.type === 'expense' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Receipt className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">Receipt</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Submitted by {activity.submittedBy}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${activity.totalAmount.toFixed(2)}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedExpense(activity);
                            setShowExpenseDetails(true);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Items
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-gray-900">Payment</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(activity.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          {activity.from} → {activity.to}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getPaymentMethodIcon(activity.method)} {getPaymentMethodName(activity.method)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${activity.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Paid</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Expense Details Modal */}
      {showExpenseDetails && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Receipt Details</h2>
                <button
                  onClick={() => setShowExpenseDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <EyeOff className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">


                {/* Basic Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Submitted by:</span>
                      <p className="font-medium">{selectedExpense.submittedBy}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p className="font-medium">{formatDate(selectedExpense.timestamp)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-medium">${selectedExpense.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <p className="font-medium">{selectedExpense.items.length}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedExpense.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.displayName}</p>
                          <p className="text-xs text-gray-500">Raw: {item.rawName}</p>
                          <p className="text-sm text-gray-600">
                            Assigned to: {item.assignedTo}
                          </p>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedExpense.customNotes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedExpense.customNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
