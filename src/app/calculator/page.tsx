'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { stateTaxRates, getStateByCode } from '@/data/taxRates';
import { TaxCalculation, ProductCategory, productCategories, categoryModifiers } from '@/types';

interface BulkResult {
  row: number;
  amount: number;
  state: string;
  stateCode: string;
  category: ProductCategory;
  rate: number;
  tax: number;
  total: number;
  error?: string;
}

export default function CalculatorPage() {
  const { user, calculations, addCalculation, addCalculations, clearCalculations, isLoading } = useAuth();
  const router = useRouter();
  
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [amount, setAmount] = useState('100');
  const [selectedState, setSelectedState] = useState('CA');
  const [category, setCategory] = useState<ProductCategory>('general');
  const [result, setResult] = useState<{ tax: number; total: number; rate: number; effectiveRate: number } | null>(null);
  
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const calculateWithCategory = (amt: number, stateCode: string, cat: ProductCategory) => {
    const state = getStateByCode(stateCode);
    if (!state) return null;
    
    let effectiveRate = state.combinedRate;
    
    // Apply category modifier if exists
    const modifier = categoryModifiers[stateCode]?.[cat];
    if (modifier !== undefined) {
      effectiveRate = state.combinedRate * modifier;
    }
    
    const tax = amt * (effectiveRate / 100);
    return {
      tax: Math.round(tax * 100) / 100,
      total: Math.round((amt + tax) * 100) / 100,
      rate: state.combinedRate,
      effectiveRate: Math.round(effectiveRate * 100) / 100,
    };
  };

  const handleCalculate = () => {
    const calc = calculateWithCategory(parseFloat(amount) || 0, selectedState, category);
    setResult(calc);
    
    if (calc) {
      const stateInfo = getStateByCode(selectedState);
      const newCalc: TaxCalculation = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount: parseFloat(amount) || 0,
        state: stateInfo?.state || selectedState,
        stateCode: selectedState,
        category,
        taxAmount: calc.tax,
        total: calc.total,
        rate: calc.effectiveRate,
      };
      addCalculation(newCalc);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBulkError('');
    setIsProcessing(true);
    setBulkResults([]);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setBulkError('CSV must have a header row and at least one data row');
        setIsProcessing(false);
        return;
      }
      
      const header = lines[0].toLowerCase();
      const hasAmount = header.includes('amount');
      const hasState = header.includes('state');
      
      if (!hasAmount || !hasState) {
        setBulkError('CSV must have "amount" and "state" columns');
        setIsProcessing(false);
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const amountIdx = headers.indexOf('amount');
      const stateIdx = headers.findIndex(h => h === 'state' || h === 'state_code');
      const categoryIdx = headers.indexOf('category');
      
      const results: BulkResult[] = [];
      const newCalcs: TaxCalculation[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const amt = parseFloat(values[amountIdx]) || 0;
        let stateCode = values[stateIdx]?.toUpperCase() || '';
        const cat = (values[categoryIdx] as ProductCategory) || 'general';
        
        // Try to find state by name or code
        let stateInfo = getStateByCode(stateCode);
        if (!stateInfo) {
          stateInfo = stateTaxRates.find(s => 
            s.state.toLowerCase() === stateCode.toLowerCase() ||
            s.stateCode.toLowerCase() === stateCode.toLowerCase()
          );
          if (stateInfo) stateCode = stateInfo.stateCode;
        }
        
        if (!stateInfo) {
          results.push({
            row: i + 1,
            amount: amt,
            state: stateCode,
            stateCode: stateCode,
            category: cat,
            rate: 0,
            tax: 0,
            total: amt,
            error: `Unknown state: ${stateCode}`,
          });
          continue;
        }
        
        const calc = calculateWithCategory(amt, stateCode, cat);
        if (calc) {
          results.push({
            row: i + 1,
            amount: amt,
            state: stateInfo.state,
            stateCode: stateCode,
            category: cat,
            rate: calc.effectiveRate,
            tax: calc.tax,
            total: calc.total,
          });
          
          newCalcs.push({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: amt,
            state: stateInfo.state,
            stateCode: stateCode,
            category: cat,
            taxAmount: calc.tax,
            total: calc.total,
            rate: calc.effectiveRate,
          });
        }
      }
      
      setBulkResults(results);
      if (newCalcs.length > 0) {
        addCalculations(newCalcs);
      }
    } catch {
      setBulkError('Error processing CSV file');
    }
    
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportResults = () => {
    const data = bulkResults.length > 0 ? bulkResults : calculations.map((c, i) => ({
      row: i + 1,
      amount: c.amount,
      state: c.state,
      stateCode: c.stateCode,
      category: c.category,
      rate: c.rate,
      tax: c.taxAmount,
      total: c.total,
    }));
    
    const csv = [
      ['Row', 'Amount', 'State', 'State Code', 'Category', 'Rate (%)', 'Tax', 'Total'].join(','),
      ...data.map(r => [r.row, r.amount, r.state, r.stateCode, r.category, r.rate, r.tax, r.total].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-calculations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tax Calculator</h1>
          <p className="text-gray-400">Calculate sales tax with product category support</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'single' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Single Calculation
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'bulk' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Bulk Upload (CSV)
          </button>
        </div>

        {mode === 'single' ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calculator */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">Calculate Tax</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Sale Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="100.00"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {stateTaxRates.map((state) => (
                      <option key={state.stateCode} value={state.stateCode} className="bg-slate-800">
                        {state.state} ({state.combinedRate}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Product Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {productCategories.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-slate-800">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-500 text-sm mt-1">
                    {productCategories.find(c => c.value === category)?.description}
                  </p>
                </div>

                <button
                  onClick={handleCalculate}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-semibold transition mt-2"
                >
                  Calculate Tax
                </button>

                {result && (
                  <div className="mt-6 p-6 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">Subtotal</div>
                        <div className="text-2xl font-bold text-white">${parseFloat(amount).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Tax ({result.effectiveRate}%)</div>
                        <div className="text-2xl font-bold text-emerald-400">${result.tax.toFixed(2)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-gray-400 text-sm">Total</div>
                        <div className="text-3xl font-bold text-white">${result.total.toFixed(2)}</div>
                      </div>
                    </div>
                    {result.rate !== result.effectiveRate && (
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <p className="text-blue-400 text-sm">
                          💡 Standard rate is {result.rate}%, but {productCategories.find(c => c.value === category)?.label} has a reduced rate of {result.effectiveRate}% in this state.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Calculation History</h2>
                <div className="flex gap-2">
                  {calculations.length > 0 && (
                    <>
                      <button
                        onClick={exportResults}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={clearCalculations}
                        className="text-red-400 hover:text-red-300 text-sm font-medium ml-3"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {calculations.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">🧮</span>
                  <p className="text-gray-400">No calculations yet</p>
                  <p className="text-gray-500 text-sm">Results will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {calculations.slice(0, 20).map((calc) => (
                    <div key={calc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <div className="font-medium text-white">${calc.amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">
                          {calc.state} • {productCategories.find(c => c.value === calc.category)?.label || calc.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-emerald-400">+${calc.taxAmount.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{calc.rate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Bulk Upload Mode
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">Bulk Tax Calculation</h2>
            
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="font-medium text-white mb-2">CSV Format</h3>
              <p className="text-gray-400 text-sm mb-3">
                Upload a CSV file with the following columns:
              </p>
              <code className="block bg-black/30 p-3 rounded text-emerald-400 text-sm">
                amount,state,category<br/>
                100.00,CA,general<br/>
                250.50,NY,clothing<br/>
                75.00,TX,food_grocery
              </code>
              <p className="text-gray-500 text-sm mt-3">
                Categories: general, clothing, food_grocery, food_prepared, digital_goods, software, medical, electronics
              </p>
            </div>

            <div className="flex gap-4 mb-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Upload CSV'}
              </button>
              {bulkResults.length > 0 && (
                <button
                  onClick={exportResults}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  Export Results
                </button>
              )}
            </div>

            {bulkError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
                {bulkError}
              </div>
            )}

            {bulkResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Row</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">State</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Rate</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Tax</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r) => (
                      <tr key={r.row} className={`border-b border-white/5 ${r.error ? 'bg-red-500/10' : ''}`}>
                        <td className="py-3 px-4 text-white">{r.row}</td>
                        <td className="py-3 px-4 text-white text-right">${r.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-white">{r.state}</td>
                        <td className="py-3 px-4 text-gray-400">{r.category}</td>
                        <td className="py-3 px-4 text-white text-right">{r.rate}%</td>
                        <td className="py-3 px-4 text-emerald-400 text-right">${r.tax.toFixed(2)}</td>
                        <td className="py-3 px-4 text-white text-right">${r.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/20">
                      <td colSpan={4} className="py-3 px-4 text-white font-medium">Totals</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-emerald-400 font-medium text-right">
                        ${bulkResults.reduce((s, r) => s + r.tax, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-white font-medium text-right">
                        ${bulkResults.reduce((s, r) => s + r.total, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
