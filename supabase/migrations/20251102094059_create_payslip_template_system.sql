/*
  # Create Payslip Template System

  1. New Tables
    - `payslip_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `is_default` (boolean) - Whether this is the default template
      - `company_name` (text) - Company name
      - `company_address` (text) - Company address
      - `company_logo_url` (text) - URL to company logo
      - `header_config` (jsonb) - Header customization settings
      - `layout_config` (jsonb) - Layout and styling settings
      - `deduction_labels` (jsonb) - Custom labels for deductions
      - `earning_labels` (jsonb) - Custom labels for earnings
      - `footer_text` (text) - Footer text
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid) - User who created the template

  2. Security
    - Enable RLS on `payslip_templates` table
    - Add policies for viewing and managing templates
*/

-- Create payslip_templates table
CREATE TABLE IF NOT EXISTS payslip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_default boolean DEFAULT false,
  company_name text NOT NULL,
  company_address text,
  company_logo_url text,
  header_config jsonb DEFAULT '{
    "showLogo": true,
    "showDate": true,
    "showReference": true,
    "dateFormat": "YYYY-MM-DD"
  }'::jsonb,
  layout_config jsonb DEFAULT '{
    "fontSize": "base",
    "fontFamily": "sans",
    "primaryColor": "#1f2937",
    "accentColor": "#3b82f6",
    "showBorders": true,
    "showShadows": false
  }'::jsonb,
  deduction_labels jsonb DEFAULT '{
    "eobi": "EOBI",
    "provident_fund": "PF",
    "tax": "WHT",
    "loan": "Loan Deduction",
    "advance": "Advance Deduction"
  }'::jsonb,
  earning_labels jsonb DEFAULT '{
    "basic_salary": "Basic Salary",
    "allowances": "Allowances",
    "bonus": "Bonus",
    "overtime": "Overtime"
  }'::jsonb,
  footer_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE payslip_templates ENABLE ROW LEVEL SECURITY;

-- Policies for payslip_templates
CREATE POLICY "Anyone can view payslip templates"
  ON payslip_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert payslip templates"
  ON payslip_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update payslip templates"
  ON payslip_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete payslip templates"
  ON payslip_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to ensure only one default template
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE payslip_templates
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for default template
DROP TRIGGER IF EXISTS ensure_single_default_template_trigger ON payslip_templates;
CREATE TRIGGER ensure_single_default_template_trigger
  AFTER INSERT OR UPDATE ON payslip_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();

-- Insert default template based on the provided example
INSERT INTO payslip_templates (
  name,
  is_default,
  company_name,
  company_address,
  header_config,
  layout_config,
  deduction_labels,
  earning_labels,
  footer_text
) VALUES (
  'Default Template',
  true,
  'Your Company Name',
  'Your Company Address',
  '{
    "showLogo": true,
    "showDate": true,
    "showReference": true,
    "dateFormat": "YYYY-MM-DD",
    "logoPosition": "right"
  }'::jsonb,
  '{
    "fontSize": "base",
    "fontFamily": "sans",
    "primaryColor": "#1f2937",
    "accentColor": "#3b82f6",
    "showBorders": true,
    "showShadows": false,
    "pageSize": "A4"
  }'::jsonb,
  '{
    "eobi": "EOBI",
    "provident_fund": "PF",
    "tax": "WHT",
    "loan": "Tour Loan",
    "advance": "Advance Deduction",
    "other": "Other Deduction"
  }'::jsonb,
  '{
    "basic_salary": "Basic Salary",
    "allowances": "Allowances",
    "bonus": "Bonus",
    "overtime": "Overtime",
    "commission": "Commission"
  }'::jsonb,
  'This is a computer generated payslip and does not require a signature.'
) ON CONFLICT DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payslip_templates_updated_at ON payslip_templates;
CREATE TRIGGER update_payslip_templates_updated_at
  BEFORE UPDATE ON payslip_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
