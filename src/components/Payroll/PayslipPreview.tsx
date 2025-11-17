import { useEffect, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../contexts/PreferencesContext';

interface PayslipPreviewProps {
  payslip: any;
  onClose: () => void;
}

export function PayslipPreview({ payslip, onClose }: PayslipPreviewProps) {
  const { formatCurrency, formatDate } = usePreferences();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('payslip_templates')
        .select('*')
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: anyTemplate } = await supabase
          .from('payslip_templates')
          .select('*')
          .limit(1)
          .single();
        setTemplate(anyTemplate);
      } else {
        setTemplate(data);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading || !template) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const grossPay = parseFloat(payslip.gross_pay || 0);
  const totalDeductions = parseFloat(payslip.deductions || 0);
  const netPay = parseFloat(payslip.net_pay || 0);
  const baseSalary = parseFloat(payslip.base_salary || 0);
  const allowances = parseFloat(payslip.allowances || 0);
  const tax = parseFloat(payslip.tax || 0);
  const bonuses = parseFloat(payslip.bonuses || 0);

  const paymentDate = payslip.payment_date ? new Date(payslip.payment_date) : new Date();
  const monthYear = paymentDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const fullMonthYear = paymentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h3 className="text-lg font-semibold">Payslip Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          id="payslip-content"
          className="p-8 bg-white"
          style={{
            fontFamily: template.layout_config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
            fontSize: template.layout_config.fontSize === 'sm' ? '14px' : template.layout_config.fontSize === 'lg' ? '18px' : '16px',
          }}
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1
                className="text-4xl font-bold mb-6"
                style={{ color: template.layout_config.primaryColor }}
              >
                Payslip
              </h1>

              <div className="space-y-2">
                <p className="text-lg font-semibold">{payslip.employee?.users?.full_name || 'Employee Name'}</p>
                {template.header_config.showDate && (
                  <div>
                    <span className="text-sm text-gray-600">Date</span>
                    <p className="font-medium">{formatDate(payslip.created_at || new Date())}</p>
                  </div>
                )}
                {template.header_config.showReference && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Reference</span>
                    <p className="font-medium">{payslip.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              {template.header_config.showLogo && template.company_logo_url && (
                <img
                  src={template.company_logo_url}
                  alt={template.company_name}
                  className="h-20 mb-4 ml-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <h2 className="text-xl font-semibold" style={{ color: template.layout_config.primaryColor }}>
                {template.company_name}
              </h2>
              {template.company_address && (
                <p className="text-sm text-gray-600 mt-1 max-w-xs ml-auto">{template.company_address}</p>
              )}
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4" style={{ color: template.layout_config.primaryColor }}>
            for the Month Of {fullMonthYear}
          </h3>

          <table
            className={`w-full mb-6 ${template.layout_config.showBorders ? 'border-2' : 'border'}`}
            style={{ borderColor: template.layout_config.primaryColor }}
          >
            <thead>
              <tr
                className={`${template.layout_config.showBorders ? 'border-b-2' : 'border-b'}`}
                style={{ borderColor: template.layout_config.primaryColor }}
              >
                <th className="text-left p-3 font-semibold">Description</th>
                <th className="text-right p-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className={template.layout_config.showBorders ? 'border-b border-gray-300' : ''}>
                <td className="p-3">{template.earning_labels?.basic_salary || 'Basic Salary'} for the Month Of {monthYear}</td>
                <td className="text-right p-3">{formatCurrency(baseSalary)}</td>
              </tr>
              {allowances > 0 && (
                <tr className={template.layout_config.showBorders ? 'border-b border-gray-300' : ''}>
                  <td className="p-3">{template.earning_labels?.allowances || 'Allowances'} for the Month Of {monthYear}</td>
                  <td className="text-right p-3">{formatCurrency(allowances)}</td>
                </tr>
              )}
              {bonuses > 0 && (
                <tr className={template.layout_config.showBorders ? 'border-b border-gray-300' : ''}>
                  <td className="p-3">{template.earning_labels?.bonus || 'Bonus'} for the Month Of {monthYear}</td>
                  <td className="text-right p-3">{formatCurrency(bonuses)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-2 mb-4">
            <div
              className="flex justify-between py-2 border-b-2"
              style={{ borderColor: template.layout_config.primaryColor }}
            >
              <span className="font-semibold">Gross pay</span>
              <span className="font-semibold">{formatCurrency(grossPay)}</span>
            </div>

            {tax > 0 && (
              <div className="flex justify-between py-1">
                <span>Less: {template.deduction_labels?.tax || 'WHT'} for the Month of {monthYear}</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}

            {(totalDeductions - tax) > 0 && (
              <div className="flex justify-between py-1">
                <span>Less: {template.deduction_labels?.other || 'Other Deductions'} for the Month of {monthYear}</span>
                <span>{formatCurrency(totalDeductions - tax)}</span>
              </div>
            )}

            <div
              className="flex justify-between py-3 border-t-2 font-bold text-lg"
              style={{
                color: template.layout_config.accentColor,
                borderColor: template.layout_config.primaryColor
              }}
            >
              <span>Net pay</span>
              <span>{formatCurrency(netPay)}</span>
            </div>
          </div>

          {template.footer_text && (
            <div className="mt-8 pt-4 border-t border-gray-300">
              <p className="text-sm text-gray-600 text-center">{template.footer_text}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-content,
          #payslip-content * {
            visibility: visible;
          }
          #payslip-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
