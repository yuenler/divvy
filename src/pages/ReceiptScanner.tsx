import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, Check, DollarSign } from 'lucide-react';
import { ReceiptAnalysis, ExpenseItem } from '../types';
import { fileToBase64, addExpense } from '../firebase/services';

export const ReceiptScanner: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [store, setStore] = useState<string>('');
  const [submittedBy, setSubmittedBy] = useState<'Yuen Ler' | 'Haoming'>('Yuen Ler');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'analyze' | 'split' | 'confirm'>('upload');

  useEffect(() => {
    const savedSubmitter = localStorage.getItem('expenseSubmitter');
    if (savedSubmitter === 'Yuen Ler' || savedSubmitter === 'Haoming') {
      setSubmittedBy(savedSubmitter);
    }
  }, []);

  const handleSubmitterChange = (value: 'Yuen Ler' | 'Haoming') => {
    setSubmittedBy(value);
    localStorage.setItem('expenseSubmitter', value);
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 800px width/height)
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file);
        setSelectedFile(compressedFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original file
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const analyzeReceipt = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      // Convert image to base64
      const base64Image = await fileToBase64(selectedFile);
      
      // Call API to analyze receipt
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Image, payerName: submittedBy, notes: customNotes }),
      });

      if (!response.ok) {
        console.log(response);
        throw new Error('Failed to analyze receipt');
      }

      const receiptData: ReceiptAnalysis = await response.json();
      setAnalysis(receiptData);
      setStore(receiptData.store || '');
      
      // Initialize items with AI suggestions
      const initialItems: ExpenseItem[] = receiptData.items.map(item => ({
        rawName: item.rawName,
        displayName: item.displayName,
        price: item.price,
        assignedTo: (item.suggestedAssignee as any) || 'Split',
        suggestedAssignee: (item.suggestedAssignee as any) || 'Split'
      }));
      setItems(initialItems);
      setStep('split');
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      alert('Failed to analyze receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateItemAssignment = (index: number, assignedTo: 'Yuen Ler' | 'Haoming' | 'Split') => {
    const updatedItems = [...items];
    updatedItems[index].assignedTo = assignedTo;
    setItems(updatedItems);
  };

  const updateItemName = (index: number, displayName: string) => {
    const updatedItems = [...items];
    updatedItems[index].displayName = displayName;
    setItems(updatedItems);
  };

  const calculateBalances = () => {
    const other = submittedBy === 'Yuen Ler' ? 'Haoming' : 'Yuen Ler';
    let otherOwes = 0;
    items.forEach(item => {
      if (item.assignedTo === 'Split') {
        otherOwes += item.price / 2;
      } else if (item.assignedTo === other) {
        otherOwes += item.price;
      }
    });
    return {
      yuenLerTotal: other === 'Yuen Ler' ? otherOwes : 0,
      haomingTotal: other === 'Haoming' ? otherOwes : 0,
    };
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { rawName: '', displayName: '', price: 0, assignedTo: 'Split' }
    ]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemPrice = (index: number, priceString: string) => {
    const price = parseFloat(priceString || '0');
    const updatedItems = [...items];
    updatedItems[index].price = isNaN(price) ? 0 : Math.max(0, price);
    setItems(updatedItems);
  };

  const submitExpense = async () => {
    if (!analysis) return;

    setLoading(true);
    try {
      const itemsTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

      await addExpense({
        timestamp: new Date(),
        totalAmount: itemsTotal,
        items,
        customNotes,
        submittedBy,
        store,
      });

      // Reset form
      setSelectedFile(null);
      setImagePreview(null);
      setAnalysis(null);
      setItems([]);
      setCustomNotes('');
      setStep('upload');
      
      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error submitting expense:', error);
      alert('Failed to submit expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const balances = calculateBalances();
  const itemsTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Scan Receipt
        </h1>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Receipt Photo
              </h2>
              <p className="text-gray-600 text-sm">
                Take a clear photo of your receipt
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">
                  Who is submitting this receipt?
                </span>
                <select
                  value={submittedBy}
                  onChange={(e) => handleSubmitterChange(e.target.value as 'Yuen Ler' | 'Haoming')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Yuen Ler">Yuen Ler</option>
                  <option value="Haoming">Haoming</option>
                </select>
              </label>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="receipt-upload"
                />
                <label
                  htmlFor="receipt-upload"
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {selectedFile ? 'Change Photo' : 'Choose Photo'}
                  </span>
                </label>
              </div>

              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">Notes (optional)</span>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g., 'Milk was only for me' or 'Cheese was for Haoming'"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  rows={3}
                />
              </label>

              <button
                onClick={analyzeReceipt}
                disabled={!selectedFile || loading}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Analyze Receipt
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAnalysis(null);
                  setItems([{ rawName: '', displayName: '', price: 0, assignedTo: 'Split' }]);
                  setStep('split');
                }}
                className="w-full mt-2 bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-200"
              >
                Enter Manually Instead
              </button>
            </div>
          </div>
        )}

        {step === 'split' && analysis && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Split Expenses
              </h2>
              <p className="text-gray-600 text-sm">
                Assign items to who should pay for them
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  Rescan receipt
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Store</span>
                <input
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder="e.g., Costco"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {items.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      value={item.displayName}
                      onChange={(e) => updateItemName(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Item name"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={String(item.price)}
                      onChange={(e) => updateItemPrice(index, e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-md text-sm text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={item.assignedTo}
                      onChange={(e) => updateItemAssignment(index, e.target.value as 'Yuen Ler' | 'Haoming' | 'Split')}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Yuen Ler">Yuen Ler</option>
                      <option value="Haoming">Haoming</option>
                      <option value="Split">Split</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="px-3 py-2 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap break-words">Raw: {item.rawName}</p>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-200"
              >
                Add Item
              </button>

              <div className="border-t pt-4">
                <label className="block mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Additional Notes (optional)
                  </span>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="e.g., 'The milk was only for me'"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    rows={3}
                  />
                </label>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Yuen Ler owes:</span>
                    <span className="font-medium">${balances.yuenLerTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Haoming owes:</span>
                    <span className="font-medium">${balances.haomingTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Total:</span>
                    <span>${itemsTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('confirm')}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Submit Expense
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Submission
              </h2>
              <p className="text-gray-600 text-sm">
                Review your expense before submitting
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Expense Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Submitted by:</span>
                    <span className="font-medium">{submittedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total amount:</span>
                    <span className="font-medium">${analysis?.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yuen Ler owes:</span>
                    <span className="font-medium">${balances.yuenLerTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Haoming owes:</span>
                    <span className="font-medium">${balances.haomingTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {customNotes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{customNotes}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('split')}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300"
                >
                  Back to Edit
                </button>
                <button
                  onClick={submitExpense}
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
