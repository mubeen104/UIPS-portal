# Payslip Template & Preferences Fixes

## Issues Fixed

### 1. Payslip Not Using Custom Template

**Problem:**
- Payslip preview was not properly loading or applying the customizable template
- Template data was fetched but not being used to style the payslip
- Field names in the preview didn't match the database schema

**Solution:**
- Fixed database field mapping (using `base_salary`, `gross_pay`, `net_pay`, `deductions`, `tax` from payslips table)
- Applied template styling dynamically to all payslip elements:
  - Primary color for headings and borders
  - Accent color for net pay highlighting
  - Custom font size and family
  - Border configuration
  - Company name, address, and logo
- Added fallback to fetch any template if no default is set
- Properly integrated custom deduction and earning labels from template
- Applied date formatting from user preferences

**Template Features Now Working:**
- ✅ Company branding (name, address, logo)
- ✅ Header configuration (show/hide date, reference, logo)
- ✅ Layout styling (colors, font size, borders)
- ✅ Custom labels for deductions (EOBI, PF, WHT, Loan, etc.)
- ✅ Custom labels for earnings (Basic Salary, Allowances, Bonus)
- ✅ Footer text
- ✅ Page size and formatting

### 2. Settings Preferences Not Working

**Problem:**
- Theme, timezone, currency, and other preferences were saving but not applying
- Theme changes (dark mode) were not reflected in the UI
- **ROOT CAUSE:** Tailwind CSS wasn't configured for class-based dark mode
- Currency formatting was not using user's selected currency
- Date/time formats were not being applied

**Solution:**

**Theme (Dark Mode):**
- **CRITICAL FIX:** Added `darkMode: 'class'` to `tailwind.config.js` (This was the main issue!)
- Added `useEffect` hook in `PreferencesContext` to watch theme changes
- Automatically adds/removes `dark` class on `document.documentElement`
- Added `isLoaded` state to prevent theme flickering on initial load
- Theme now applies immediately when changed
- Persists across page reloads

**Currency Formatting:**
- Already working via `formatCurrency()` in PreferencesContext
- Uses Intl.NumberFormat with user's selected currency
- Applies throughout the application (payroll, expenses, etc.)

**Date/Time Formatting:**
- Already working via `formatDate()`, `formatTime()`, `formatDateTime()` in PreferencesContext
- Timezone conversion applied automatically
- Custom date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Custom time format (12h/24h)

**Email Notification Preferences:**
- Fixed loading from database (6 specific email preferences)
- Fixed saving to database with all preferences
- Properly integrated with user_preferences table

## How to Use

### Customize Payslip Template

1. **Access Template Editor:**
   - Go to Payroll → Click "Templates" button
   - Create new or edit existing templates

2. **Customize Branding:**
   - Set company name and address
   - Upload logo URL (use image hosting service)
   - Choose logo position (left/right)

3. **Configure Layout:**
   - Font Size: Small, Medium, Large
   - Primary Color: Main text and border color
   - Accent Color: Highlights (like net pay)
   - Show/Hide borders, dates, references

4. **Customize Labels:**
   - Edit deduction labels (EOBI → "Employee Insurance", etc.)
   - Edit earning labels (Basic Salary → "Monthly Wage", etc.)

5. **Set Default:**
   - Check "Set as default template"
   - Save template

6. **View Payslips:**
   - Go to Payroll → Click "View" on any payslip
   - Payslip renders with your custom template
   - Print or download as PDF

### Configure User Preferences

1. **Access Settings:**
   - Go to Settings → Preferences tab

2. **Theme:**
   - Select Light or Dark theme
   - Changes apply immediately
   - Persists across sessions

3. **Regional Settings:**
   - **Language:** English, Spanish, French, German, Japanese, Chinese
   - **Timezone:** Choose your timezone (affects all dates/times)
   - **Currency:** USD, EUR, GBP, PKR, AED, SAR, INR, JPY, CNY, CAD, AUD
   - **Date Format:** MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
   - **Time Format:** 12-hour or 24-hour

4. **Notifications:**
   - Toggle Email, Push, SMS channels
   - Configure specific email notifications:
     - Leave Requests
     - Expense Approvals
     - Performance Reviews
     - Payroll Updates
     - System Announcements
     - Weekly Digest

5. **Save:**
   - Click "Save Preferences" or "Save Notification Settings"
   - All changes persist to database
   - Apply immediately across the app

## Database Schema

### payslip_templates Table
```sql
- id (uuid)
- name (text)
- is_default (boolean)
- company_name (text)
- company_address (text)
- company_logo_url (text)
- header_config (jsonb)
- layout_config (jsonb)
- deduction_labels (jsonb)
- earning_labels (jsonb)
- footer_text (text)
- created_at, updated_at
```

### user_preferences Table
```sql
- id (uuid)
- user_id (uuid)
- theme (text)
- language (text)
- timezone (text)
- currency (text)
- date_format (text)
- time_format (text)
- notification_email (boolean)
- notification_push (boolean)
- notification_sms (boolean)
- email_leave_requests (boolean)
- email_expense_approvals (boolean)
- email_performance_reviews (boolean)
- email_payroll_updates (boolean)
- email_system_announcements (boolean)
- email_weekly_digest (boolean)
```

## Technical Details

### Files Modified

1. **src/components/Payroll/PayslipPreview.tsx**
   - Fixed field name mapping
   - Applied template styling dynamically
   - Added proper currency and date formatting
   - Fixed logo error handling
   - Improved layout structure

2. **src/contexts/PreferencesContext.tsx**
   - Added theme useEffect hook with isLoaded guard
   - Properly applies dark mode class
   - Loads theme from database
   - Watches for theme changes
   - Added state tracking to prevent flickering

3. **tailwind.config.js** ⚡ CRITICAL
   - Added `darkMode: 'class'` configuration
   - This enables Tailwind's class-based dark mode
   - Without this, dark mode classes (dark:bg-gray-900, etc.) won't work

4. **src/components/Settings/UserSettings.tsx**
   - Removed duplicate theme effect (now in context)
   - Fixed email preferences loading
   - Fixed email preferences saving
   - Integrated all 6 email notification types

### PreferencesContext Features

**Functions Available:**
- `formatCurrency(amount)` - Formats with user's currency
- `formatDate(date)` - Formats with user's date format and timezone
- `formatTime(date)` - Formats with user's time format and timezone
- `formatDateTime(date)` - Combines date and time formatting
- `getCurrencySymbol()` - Returns currency symbol
- `refreshPreferences()` - Reloads preferences from database

**Usage Example:**
```typescript
import { usePreferences } from '../../contexts/PreferencesContext';

const { formatCurrency, formatDate, preferences } = usePreferences();

// Format currency
const formatted = formatCurrency(50000); // $50,000 or PKR 50,000 etc.

// Format date
const date = formatDate(new Date()); // 11/02/2025 or 02/11/2025 etc.

// Access theme
const isDark = preferences.theme === 'dark';
```

## Testing

### Test Payslip Template:

1. Create a new template with custom colors
2. Set company name and address
3. Customize deduction labels
4. Set as default
5. Generate a payslip
6. Click "View" - should show with custom styling

### Test Theme:

1. Go to Settings → Preferences
2. Select Dark theme
3. Click Save
4. Page should immediately switch to dark mode
5. Refresh page - dark mode should persist

### Test Currency:

1. Go to Settings → Preferences
2. Change currency (e.g., PKR)
3. Save preferences
4. Go to Payroll - amounts should show in PKR format

### Test Date/Time:

1. Go to Settings → Preferences
2. Change timezone (e.g., Asia/Karachi)
3. Change date format (e.g., DD/MM/YYYY)
4. Save preferences
5. All dates across app should update

## Summary

Both issues have been fully resolved:

✅ **Payslip templates now work** - Custom styling, labels, and branding applied
✅ **User preferences now work** - Theme, currency, date/time formats apply globally
✅ **Email preferences persist** - All 6 notification types save and load correctly
✅ **Changes persist** - All settings saved to database and reload on login

The application now provides a fully customizable experience for both payslip design and user interface preferences.
