import { useState, useRef } from 'react';
import { Upload, Download, X, Check, AlertCircle, FileText, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

export function BulkImport({ onClose, onImportComplete }: Props) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const sampleCSV = `full_name,email,phone,date_of_birth,gender,address,city,state,country,postal_code,department_name,position,employment_type,hire_date,monthly_salary
John Doe,john.doe@company.com,+1-555-0101,1990-05-15,Male,123 Main St,New York,NY,USA,10001,Engineering,Software Engineer,Full-time,2024-01-15,8500
Jane Smith,jane.smith@company.com,+1-555-0102,1988-08-22,Female,456 Oak Ave,Los Angeles,CA,USA,90001,Marketing,Marketing Manager,Full-time,2024-02-01,7500
Bob Johnson,bob.johnson@company.com,+1-555-0103,1992-11-30,Male,789 Pine Rd,Chicago,IL,USA,60601,Sales,Sales Representative,Full-time,2024-03-10,6500`;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_sample.csv';
    a.click();
    showToast('Sample CSV downloaded', 'success');
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const validateRow = (row: any, rowIndex: number): string | null => {
    if (!row.full_name) return `Row ${rowIndex}: Missing full_name`;
    if (!row.email) return `Row ${rowIndex}: Missing email`;
    if (!row.email.includes('@')) return `Row ${rowIndex}: Invalid email format`;
    if (!row.department_name) return `Row ${rowIndex}: Missing department_name`;
    if (!row.position) return `Row ${rowIndex}: Missing position`;
    if (!row.hire_date) return `Row ${rowIndex}: Missing hire_date`;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.hire_date)) {
      return `Row ${rowIndex}: Invalid hire_date format (use YYYY-MM-DD)`;
    }
    if (row.date_of_birth && !dateRegex.test(row.date_of_birth)) {
      return `Row ${rowIndex}: Invalid date_of_birth format (use YYYY-MM-DD)`;
    }

    return null;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        showToast('No data found in CSV file', 'error');
        setImporting(false);
        return;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const validationError = validateRow(row, i + 2);

        if (validationError) {
          errors.push(validationError);
          continue;
        }

        try {
          // Find or create department
          let departmentId: string | null = null;
          const { data: existingDept } = await supabase
            .from('departments')
            .select('id')
            .eq('name', row.department_name)
            .maybeSingle();

          if (existingDept) {
            departmentId = existingDept.id;
          } else {
            const { data: newDept, error: deptError } = await supabase
              .from('departments')
              .insert({ name: row.department_name })
              .select('id')
              .single();

            if (deptError) throw deptError;
            departmentId = newDept.id;
          }

          // Create user account via Edge Function
          const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session');

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee-user`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: row.email,
                password: tempPassword,
                full_name: row.full_name,
                phone: row.phone || null,
                department_id: departmentId,
              }),
            }
          );

          const result = await response.json();

          if (!result.success) {
            if (result.error?.includes('already exists')) {
              errors.push(`Row ${i + 2}: Email ${row.email} already exists`);
              continue;
            }
            throw new Error(result.error || 'Failed to create user');
          }

          const userId = result.user_id;

          // Create employee record
          const { error: empError } = await supabase
            .from('employees')
            .insert({
              user_id: userId,
              employee_id: `EMP${Date.now()}${i}`,
              department_id: departmentId,
              position: row.position,
              date_of_birth: row.date_of_birth || null,
              gender: row.gender || null,
              address: row.address || null,
              city: row.city || null,
              state: row.state || null,
              country: row.country || null,
              postal_code: row.postal_code || null,
              hire_date: row.hire_date,
              employment_type: row.employment_type || 'Full-time',
              salary: parseFloat(row.monthly_salary || row.salary) || 0,
              status: 'active',
            });

          if (empError) throw empError;

          // Create notification for new employee
          await supabase.rpc('create_notification', {
            p_user_id: userId,
            p_type: 'info',
            p_category: 'system',
            p_title: 'Welcome to the Team!',
            p_message: `Your account has been created. Your temporary password is: ${tempPassword}. Please change it after logging in.`
          });

          successCount++;
        } catch (error: any) {
          console.error(`Error importing row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error.message || 'Failed to import'}`);
        }
      }

      // Log import activity
      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'create',
        p_resource_type: 'employees',
        p_resource_id: null,
        p_changes: {
          bulk_import: true,
          total: rows.length,
          success: successCount,
          failed: errors.length
        }
      });

      setResult({
        success: successCount,
        failed: errors.length,
        errors: errors,
      });

      if (successCount > 0) {
        showToast(`Successfully imported ${successCount} employees`, 'success');
        onImportComplete();
      }

      if (errors.length > 0) {
        showToast(`${errors.length} employees failed to import`, 'error');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      showToast(error.message || 'Failed to import employees', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">Bulk Import Employees</h3>
              <p className="text-sm text-gray-600 mt-1">Upload a CSV file to import multiple employees</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!result ? (
            <div className="space-y-6">
              <div className="flex gap-3">
                <button
                  onClick={downloadSample}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Download Sample CSV
                </button>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  <FileText className="w-5 h-5" />
                  {showGuide ? 'Hide' : 'Show'} CSV Guide
                </button>
              </div>

              {showGuide && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">CSV Format Guide</h4>
                  <div className="space-y-3 text-sm text-blue-800">
                    <div>
                      <p className="font-medium mb-2">Required Fields:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><code className="bg-blue-100 px-1 rounded">full_name</code> - Employee full name</li>
                        <li><code className="bg-blue-100 px-1 rounded">email</code> - Valid email address (must be unique)</li>
                        <li><code className="bg-blue-100 px-1 rounded">department_name</code> - Department name (will be created if doesn't exist)</li>
                        <li><code className="bg-blue-100 px-1 rounded">position</code> - Job title/position</li>
                        <li><code className="bg-blue-100 px-1 rounded">hire_date</code> - Date in YYYY-MM-DD format (e.g., 2024-01-15)</li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium mb-2">Optional Fields:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><code className="bg-blue-100 px-1 rounded">phone</code> - Phone number with country code</li>
                        <li><code className="bg-blue-100 px-1 rounded">date_of_birth</code> - Date in YYYY-MM-DD format</li>
                        <li><code className="bg-blue-100 px-1 rounded">gender</code> - Male, Female, Other</li>
                        <li><code className="bg-blue-100 px-1 rounded">address</code> - Street address</li>
                        <li><code className="bg-blue-100 px-1 rounded">city</code> - City name</li>
                        <li><code className="bg-blue-100 px-1 rounded">state</code> - State/Province</li>
                        <li><code className="bg-blue-100 px-1 rounded">country</code> - Country name</li>
                        <li><code className="bg-blue-100 px-1 rounded">postal_code</code> - ZIP/Postal code</li>
                        <li><code className="bg-blue-100 px-1 rounded">employment_type</code> - Full-time, Part-time, Contract, Intern</li>
                        <li><code className="bg-blue-100 px-1 rounded">monthly_salary</code> - Monthly salary (numeric value)</li>
                      </ul>
                    </div>

                    <div className="bg-blue-100 rounded p-3 mt-3">
                      <p className="font-medium mb-2">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                        <li>Each employee will receive a temporary password via notification</li>
                        <li>Employees must change their password on first login</li>
                        <li>All email addresses must be unique</li>
                        <li>Dates must be in YYYY-MM-DD format</li>
                        <li>Department will be created automatically if it doesn't exist</li>
                        <li>CSV file must have headers in the first row</li>
                        <li>Do not use commas within field values</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {file ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Size: {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                        >
                          Choose Different File
                        </button>
                        <button
                          onClick={handleImport}
                          disabled={importing}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                        >
                          {importing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Import Employees
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 font-medium mb-2">
                        Drop your CSV file here or click to browse
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Maximum file size: 5MB
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Select CSV File
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Check className="w-6 h-6 text-green-600" />
                    <h4 className="font-semibold text-green-900">Successful Imports</h4>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{result.success}</p>
                  <p className="text-sm text-green-600 mt-1">Employees added successfully</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <h4 className="font-semibold text-red-900">Failed Imports</h4>
                  </div>
                  <p className="text-3xl font-bold text-red-700">{result.failed}</p>
                  <p className="text-sm text-red-600 mt-1">Employees failed to import</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Import Errors
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-700">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
