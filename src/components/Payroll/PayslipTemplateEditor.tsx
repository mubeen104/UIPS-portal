import { useState, useEffect } from 'react';
import { Save, Eye, Plus, Edit2, Trash2, Check, Upload, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';

interface PayslipTemplate {
  id: string;
  name: string;
  is_default: boolean;
  company_name: string;
  company_address: string;
  company_logo_url: string | null;
  header_config: any;
  layout_config: any;
  deduction_labels: any;
  earning_labels: any;
  footer_text: string | null;
}

export function PayslipTemplateEditor() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<PayslipTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PayslipTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    company_address: '',
    company_logo_url: '',
    footer_text: '',
    is_default: false,
  });

  const [headerConfig, setHeaderConfig] = useState({
    showLogo: true,
    showDate: true,
    showReference: true,
    dateFormat: 'YYYY-MM-DD',
    logoPosition: 'right',
  });

  const [layoutConfig, setLayoutConfig] = useState({
    fontSize: 'base',
    fontFamily: 'sans',
    primaryColor: '#1f2937',
    accentColor: '#3b82f6',
    showBorders: true,
    showShadows: false,
    pageSize: 'A4',
  });

  const [deductionLabels, setDeductionLabels] = useState({
    eobi: 'EOBI',
    provident_fund: 'PF',
    tax: 'WHT',
    loan: 'Tour Loan',
    advance: 'Advance Deduction',
    other: 'Other Deduction',
  });

  const [earningLabels, setEarningLabels] = useState({
    basic_salary: 'Basic Salary',
    allowances: 'Allowances',
    bonus: 'Bonus',
    overtime: 'Overtime',
    commission: 'Commission',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payslip_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = (template: PayslipTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      company_name: template.company_name,
      company_address: template.company_address || '',
      company_logo_url: template.company_logo_url || '',
      footer_text: template.footer_text || '',
      is_default: template.is_default,
    });
    setHeaderConfig(template.header_config);
    setLayoutConfig(template.layout_config);
    setDeductionLabels(template.deduction_labels);
    setEarningLabels(template.earning_labels);
    setShowEditor(true);
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      company_name: '',
      company_address: '',
      company_logo_url: '',
      footer_text: '',
      is_default: false,
    });
    setHeaderConfig({
      showLogo: true,
      showDate: true,
      showReference: true,
      dateFormat: 'YYYY-MM-DD',
      logoPosition: 'right',
    });
    setLayoutConfig({
      fontSize: 'base',
      fontFamily: 'sans',
      primaryColor: '#1f2937',
      accentColor: '#3b82f6',
      showBorders: true,
      showShadows: false,
      pageSize: 'A4',
    });
  };

  const saveTemplate = async () => {
    if (!formData.name || !formData.company_name) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      setSaving(true);
      const templateData = {
        name: formData.name,
        company_name: formData.company_name,
        company_address: formData.company_address,
        company_logo_url: formData.company_logo_url,
        header_config: headerConfig,
        layout_config: layoutConfig,
        deduction_labels: deductionLabels,
        earning_labels: earningLabels,
        footer_text: formData.footer_text,
        is_default: formData.is_default,
        created_by: profile?.id,
      };

      if (selectedTemplate) {
        const { error } = await supabase
          .from('payslip_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        showToast('Template updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('payslip_templates')
          .insert([templateData]);

        if (error) throw error;
        showToast('Template created successfully', 'success');
      }

      setShowEditor(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      showToast(error.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('payslip_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Template deleted successfully', 'success');
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showToast(error.message || 'Failed to delete template', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payslip Templates</h2>
          <p className="text-gray-600 mt-1">Customize your payslip design and layout</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {!showEditor ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-blue-400 transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{template.company_name}</p>
                </div>
                {template.is_default && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    <Check className="w-3 h-3" />
                    Default
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Font Size: {template.layout_config.fontSize}</p>
                <p>Page Size: {template.layout_config.pageSize}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => loadTemplate(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {!template.is_default && (
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-6">
            {selectedTemplate ? 'Edit Template' : 'Create New Template'}
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Default Template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company Name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                <textarea
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Office address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo URL</label>
                <input
                  type="text"
                  value={formData.company_logo_url}
                  onChange={(e) => setFormData({ ...formData, company_logo_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">Upload your logo to a hosting service and paste the URL here</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-4">Layout Settings</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                  <select
                    value={layoutConfig.fontSize}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fontSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="sm">Small</option>
                    <option value="base">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                  <select
                    value={layoutConfig.pageSize}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, pageSize: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <input
                    type="color"
                    value={layoutConfig.primaryColor}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, primaryColor: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                  <input
                    type="color"
                    value={layoutConfig.accentColor}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, accentColor: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={headerConfig.showLogo}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, showLogo: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Show Logo</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={headerConfig.showDate}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, showDate: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Show Date</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={headerConfig.showReference}
                    onChange={(e) => setHeaderConfig({ ...headerConfig, showReference: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Show Reference</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={layoutConfig.showBorders}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, showBorders: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Show Borders</span>
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-4">Deduction Labels</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(deductionLabels).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace('_', ' ')}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setDeductionLabels({ ...deductionLabels, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-4">Earning Labels</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(earningLabels).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace('_', ' ')}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setEarningLabels({ ...earningLabels, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-4">Footer</h4>
              <textarea
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="This is a computer generated payslip..."
              />
            </div>

            <div className="border-t pt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Set as default template</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetForm();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
