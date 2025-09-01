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
  const [tax, setTax] = useState<number>(0);
  const [tip, setTip] = useState<number>(0);

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
        const maxSize = 2000;
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
          0.95 // 95% quality
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
      setTax(receiptData.tax || 0);
      setTip(receiptData.tip || 0);
      
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

  const calculateOtherPersonOwes = () => {
    const other = submittedBy === 'Yuen Ler' ? 'Haoming' : 'Yuen Ler';
    let otherOwesForItems = 0;
    items.forEach(item => {
      if (item.assignedTo === 'Split') {
        otherOwesForItems += item.price / 2;
      } else if (item.assignedTo === other) {
        otherOwesForItems += item.price;
      }
    });
    
    // Calculate proportional tax and tip for the other person
    const itemsTotal = items.reduce((sum, item) => sum + item.price, 0);
    let otherTaxTip = 0;
    if (itemsTotal > 0 && (tax + tip) > 0) {
      const otherProportion = otherOwesForItems / itemsTotal;
      otherTaxTip = (tax + tip) * otherProportion;
    }
    
    return otherOwesForItems + otherTaxTip;
  };

  const calculateBalances = () => {
    const otherPersonOwes = calculateOtherPersonOwes();
    return {
      yuenLerTotal: submittedBy === 'Haoming' ? otherPersonOwes : 0,
      haomingTotal: submittedBy === 'Yuen Ler' ? otherPersonOwes : 0,
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
    setLoading(true);
    try {
      const itemsTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      const totalAmount = itemsTotal + tax + tip;

      // Calculate how much the other person owes (items + proportional tax/tip)
      const otherPersonOwes = calculateOtherPersonOwes();

      await addExpense({
        timestamp: new Date(),
        totalAmount,
        items,
        customNotes,
        submittedBy,
        store,
        tax,
        tip,
        otherPersonOwes,
      });

      // Reset form
      setSelectedFile(null);
      setImagePreview(null);
      setAnalysis(null);
      setItems([]);
      setCustomNotes('');
      setTax(0);
      setTip(0);
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
  const totalWithTaxTip = itemsTotal + tax + tip;

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
                  setItems([{ 
                    rawName: 'Manual Entry', 
                    displayName: '', 
                    price: 0, 
                    assignedTo: 'Split' 
                  }]);
                  setStore('');
                  setCustomNotes('');
                  setTax(0);
                  setTip(0);
                  setStep('split');
                }}
                className="w-full mt-2 bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-200"
              >
                Enter Manually Instead
              </button>
            </div>
          </div>
        )}

        {step === 'split' && (
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tax</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tip</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={tip}
                    onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {items.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex gap-2">
                      <input
                        value={item.displayName}
                        onChange={(e) => updateItemName(index, e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={String(item.price)}
                        onChange={(e) => updateItemPrice(index, e.target.value)}
                        className="w-20 flex-shrink-0 px-2 py-2 border border-gray-300 rounded-md text-sm text-right"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={item.assignedTo}
                      onChange={(e) => updateItemAssignment(index, e.target.value as 'Yuen Ler' | 'Haoming' | 'Split')}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Yuen Ler">Yuen Ler</option>
                      <option value="Haoming">Haoming</option>
                      <option value="Split">Split</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="flex-shrink-0 px-3 py-2 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded hover:bg-red-50"
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
                    <span>Items subtotal:</span>
                    <span>${itemsTotal.toFixed(2)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  )}
                  {tip > 0 && (
                    <div className="flex justify-between">
                      <span>Tip:</span>
                      <span>${tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span>Total:</span>
                    <span className="font-semibold">${totalWithTaxTip.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Yuen Ler owes:</span>
                    <span className="font-medium">${balances.yuenLerTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Haoming owes:</span>
                    <span className="font-medium">${balances.haomingTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {analysis && Math.abs((analysis.total || 0) - totalWithTaxTip) > 0.10 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <div className="flex items-start">
                    <div className="text-yellow-600 mr-2">⚠️</div>
                    <div className="text-sm flex-1">
                      <p className="font-medium text-yellow-800 mb-1">Scanning discrepancy detected</p>
                      <p className="text-yellow-700 mb-3">
                        AI detected ${(analysis.total || 0).toFixed(2)} but total with tax/tip is ${totalWithTaxTip.toFixed(2)}. 
                        This could mean some items weren't scanned properly, prices need adjustment, or the AI didn't detect an additional fee/tax/credit.
                        Please double-check the item list above.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const discrepancy = (analysis.total || 0) - totalWithTaxTip;
                          setItems(prev => [
                            ...prev,
                            { 
                              rawName: 'Unknown Fee', 
                              displayName: discrepancy > 0 ? 'Additional Fee' : 'Credit/Discount', 
                              price: Math.abs(discrepancy), 
                              assignedTo: 'Split' 
                            }
                          ]);
                        }}
                        className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-medium hover:bg-yellow-200 transition-colors"
                      >
                        Add Unknown Fee (${Math.abs((analysis.total || 0) - totalWithTaxTip).toFixed(2)})
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                    <span>Items subtotal:</span>
                    <span>${itemsTotal.toFixed(2)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                  )}
                  {tip > 0 && (
                    <div className="flex justify-between">
                      <span>Tip:</span>
                      <span>${tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span>Total amount:</span>
                    <span className="font-medium">${totalWithTaxTip.toFixed(2)}</span>
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
