import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Payslip } from '../../types';
import { DollarSign, Plus, Eye, Settings, FileText } from 'lucide-react';
import { PayrollForm } from './PayrollForm';
import { PayslipPreview } from './PayslipPreview';
import { PayslipTemplateEditor } from './PayslipTemplateEditor';
import { usePreferences } from '../../contexts/PreferencesContext';

export function PayrollView() {
  const { formatCurrency, formatDate } = usePreferences();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          payroll_periods (name, start_date, end_date)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayslips(data || []);
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleViewPayslip = async (payslip: Payslip) => {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          employee:employees!payslips_employee_id_fkey(
            id,
            employee_number,
            users(full_name, email)
          )
        `)
        .eq('id', payslip.id)
        .single();

      if (error) throw error;
      setSelectedPayslip(data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error fetching payslip details:', error);
    }
  };

  if (showTemplates) {
    return <PayslipTemplateEditor />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Payroll Management</h1>
          <p className="text-gray-600">Manage employee payroll and compensation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Settings className="w-5 h-5" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition focus-ring"
          >
            <Plus className="w-5 h-5" />
            <span>Generate Payslip</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Payslips</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Allowances</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Net Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payslips.map((payslip) => (
                <tr key={payslip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{payslip.payroll_periods?.name}</div>
                      <div className="text-xs text-gray-500">
                        {payslip.payroll_periods?.start_date && formatDate(payslip.payroll_periods.start_date)} - {payslip.payroll_periods?.end_date && formatDate(payslip.payroll_periods.end_date)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payslip.base_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    +{formatCurrency(payslip.allowances)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -{formatCurrency(payslip.deductions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(payslip.net_pay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payslip.status)}`}>
                      {payslip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewPayslip(payslip)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payslips.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payslips available</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <PayrollForm
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchPayslips();
          }}
        />
      )}

      {showPreview && selectedPayslip && (
        <PayslipPreview
          payslip={selectedPayslip}
          onClose={() => {
            setShowPreview(false);
            setSelectedPayslip(null);
          }}
        />
      )}
    </div>
  );
}
