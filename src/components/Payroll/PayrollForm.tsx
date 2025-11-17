import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee } from '../../types';
import { X, Calculator } from 'lucide-react';

interface PayrollFormProps {
  onClose: () => void;
  onSave: () => void;
}

export function PayrollForm({ onClose, onSave }: PayrollFormProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    period_id: '',
    base_salary: '',
    allowances: '0',
    bonuses: '0',
    tax: '0',
    deductions: '0',
    status: 'draft' as 'draft' | 'approved' | 'paid',
    payment_date: '',
    notes: '',
  });

  const [calculated, setCalculated] = useState({
    gross_pay: 0,
    net_pay: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculatePay();
  }, [formData.base_salary, formData.allowances, formData.bonuses, formData.tax, formData.deductions]);

  useEffect(() => {
    const employee = employees.find(e => e.id === formData.employee_id);
    if (employee) {
      setFormData(prev => ({ ...prev, base_salary: employee.salary.toString() }));
    }
  }, [formData.employee_id, employees]);

  const fetchData = async () => {
    const [employeesData, periodsData] = await Promise.all([
      supabase
        .from('employees')
        .select('*, users(full_name)')
        .eq('status', 'active')
        .order('created_at'),
      supabase.from('payroll_periods').select('*').order('start_date', { ascending: false }),
    ]);

    setEmployees(employeesData.data || []);
    setPeriods(periodsData.data || []);
  };

  const calculatePay = () => {
    const base = parseFloat(formData.base_salary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const bonuses = parseFloat(formData.bonuses) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const deductions = parseFloat(formData.deductions) || 0;

    const gross = base + allowances + bonuses;
    const net = gross - tax - deductions;

    setCalculated({
      gross_pay: gross,
      net_pay: net,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('payslips').insert({
        employee_id: formData.employee_id,
        period_id: formData.period_id || null,
        base_salary: parseFloat(formData.base_salary),
        allowances: parseFloat(formData.allowances),
        bonuses: parseFloat(formData.bonuses),
        gross_pay: calculated.gross_pay,
        tax: parseFloat(formData.tax),
        deductions: parseFloat(formData.deductions),
        net_pay: calculated.net_pay,
        status: formData.status,
        payment_date: formData.payment_date || null,
        notes: formData.notes || null,
      });

      if (error) throw error;
      onSave();
    } catch (error: any) {
      console.error('Error saving payslip:', error);
      alert(error.message || 'Failed to generate payslip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            Generate Payslip
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition focus-ring rounded-lg"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                id="employee"
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.users?.full_name} - {emp.position}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
                Pay Period
              </label>
              <select
                id="period"
                value={formData.period_id}
                onChange={(e) => setFormData({ ...formData, period_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="">Select Period</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="base_salary" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Base Salary <span className="text-red-500">*</span>
              </label>
              <input
                id="base_salary"
                type="number"
                required
                step="0.01"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="5000.00"
              />
            </div>

            <div>
              <label htmlFor="allowances" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Allowances
              </label>
              <input
                id="allowances"
                type="number"
                step="0.01"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="bonuses" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Bonuses
              </label>
              <input
                id="bonuses"
                type="number"
                step="0.01"
                value={formData.bonuses}
                onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="tax" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Tax
              </label>
              <input
                id="tax"
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="deductions" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Other Deductions
              </label>
              <input
                id="deductions"
                type="number"
                step="0.01"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="Additional notes or comments..."
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Calculation Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700">Monthly Gross Pay</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${calculated.gross_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Monthly Net Pay</p>
                <p className="text-2xl font-bold text-green-600">
                  ${calculated.net_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              {loading ? 'Generating...' : 'Generate Payslip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
