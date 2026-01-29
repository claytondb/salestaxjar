'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, ExternalLink } from 'lucide-react';

interface ImportResult {
  success: boolean;
  ordersImported?: number;
  totalSales?: number;
  totalTax?: number;
  errors?: string[];
}

export function AmazonManualImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResult(null);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/platforms/amazon/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          ordersImported: data.ordersImported,
          totalSales: data.totalSales,
          totalTax: data.totalTax,
        });
        setFile(null);
      } else {
        setResult({
          success: false,
          errors: [data.error || 'Failed to import file'],
        });
      }
    } catch (error) {
      setResult({
        success: false,
        errors: ['Network error. Please try again.'],
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          How to Export Your Amazon Tax Report
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>
            Go to{' '}
            <a
              href="https://sellercentral.amazon.com/tax/tax-library"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium inline-flex items-center gap-1"
            >
              Amazon Seller Central Tax Library
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Select <strong>"Sales Tax Report"</strong> or <strong>"Tax Document Library"</strong></li>
          <li>Choose your date range (we recommend monthly reports)</li>
          <li>Click <strong>"Generate Report"</strong> and wait for it to complete</li>
          <li>Download the CSV file</li>
          <li>Upload the file below</li>
        </ol>
        
        <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>Supported formats:</strong> Amazon Sales Tax Report CSV, Transaction Report CSV
          </p>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive 
            ? 'border-green-500 bg-green-50 dark:bg-green-950' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-theme-muted" />
        
        {file ? (
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {file.name}
            </p>
            <p className="text-sm text-theme-muted dark:text-theme-muted">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Drop your Amazon CSV file here
            </p>
            <p className="text-sm text-theme-muted dark:text-theme-muted">
              or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-theme-primary font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Import Tax Data
            </>
          )}
        </button>
      )}

      {/* Result */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
          }`}
        >
          {result.success ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Import Successful!
                </h4>
                <div className="mt-2 text-sm text-green-800 dark:text-green-200 space-y-1">
                  <p><strong>{result.ordersImported}</strong> orders imported</p>
                  <p>Total sales: <strong>${result.totalSales?.toLocaleString()}</strong></p>
                  <p>Total tax collected: <strong>${result.totalTax?.toLocaleString()}</strong></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100">
                  Import Failed
                </h4>
                <ul className="mt-2 text-sm text-red-800 dark:text-red-200 list-disc list-inside">
                  {result.errors?.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alternative: Scheduled Reports */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Pro Tip: Set Up Automatic Reports
        </h3>
        <p className="text-sm text-gray-600 dark:text-theme-muted mb-3">
          Amazon can automatically generate and email you tax reports on a schedule.
          Set this up once and just upload the emailed reports here.
        </p>
        <a
          href="https://sellercentral.amazon.com/gp/reports/settings.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Configure Scheduled Reports
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
