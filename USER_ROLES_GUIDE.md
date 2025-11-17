# User Roles and Permissions Guide

## Overview

The HR Portal implements a clean three-tier role-based access control system:

1. **Simple User** (Employee) - Read-only access to personal data
2. **Super User** - Configurable access to assigned departments and employees
3. **Admin** - Full system access with complete control

## Role Descriptions

### Simple User (Employee)

**Default Role for New Users**

Simple users have the most restricted access level, designed for regular employees who only need to manage their own information.

**Access Rights:**
- View own personal information
- View own attendance records
- Submit and view own leave requests
- Submit and view own expense claims
- View own performance reviews
- View own payroll information
- Update personal settings and preferences

**Restrictions:**
- Cannot view other employees' information
- Cannot access management features
- Cannot approve requests or manage data
- Cannot configure permissions or access admin features

**Dashboard View:**
- Leave Balance (total days remaining)
- Attendance This Month (days present)
- Pending Expenses (awaiting approval)

### Super User

**Flexible Role with Granular Permissions**

Super users are managers or team leads with configurable access to specific departments and employees. Admins control exactly what each super user can see and manage.

**Configurable Permissions:**

#### Department-Level Access
Super users can be granted access to entire departments with specific permissions:

- **Employee Management**
  - View Employees: See employee profiles and details
  - Edit Employees: Modify employee information

- **Attendance**
  - View Attendance: See attendance records
  - Manage Attendance: Mark and edit attendance

- **Leave Management**
  - View Leaves: See all leave requests
  - Approve Leaves: Approve or reject requests

- **Payroll**
  - View Payroll: See salary information and payslips
  - Manage Payroll: Process payroll

- **Expenses**
  - View Expenses: See expense claims
  - Approve Expenses: Approve or reject claims

- **Performance**
  - View Performance: See performance reviews
  - Manage Performance: Create and edit reviews

#### Employee-Level Access
For fine-grained control, admins can grant super users access to specific employees within departments:

- **View Permission**: See employee's information
- **Edit Permission**: Modify employee's data

**Dashboard View:**
- Total Employees (accessible count)
- Active Employees (accessible active count)
- Pending Leaves (for accessible employees)
- Pending Expenses (for accessible employees)
- Today's Attendance (for accessible employees)

### Admin

**Full System Control**

Administrators have unrestricted access to all features and data.

**Access Rights:**
- Complete access to all modules and features
- Manage all users and assign roles
- Configure permissions for super users
- View and manage all departments
- Access all employee data across the organization
- Configure system settings
- View activity logs and audit trails
- Manage recruitment and job postings

**Exclusive Features:**
- User Management: Create, edit, and delete users
- Role Assignment: Promote/demote users between roles
- Permission Configuration: Grant department and employee access
- Department Management: Create and manage departments
- Activity Logs: View all system activities
- System Settings: Configure global settings

**Dashboard View:**
- Total Employees (organization-wide)
- Active Employees (all active)
- Pending Leaves (all pending)
- Pending Expenses (all pending)
- Today's Attendance (organization-wide)
- Open Job Positions

## Permission Management

### For Admins: Assigning Permissions to Super Users

1. **Navigate to User Management**
   - Go to User Management from the sidebar
   - Find the user you want to configure

2. **Set Role to Super User**
   - Change the user's role to "Super User"
   - This enables the permissions button

3. **Configure Department Permissions**
   - Click "Permissions" button next to the user
   - Select departments to grant access to
   - For each department, toggle specific permissions:
     - View vs. Manage permissions
     - Approval rights
     - Data access levels

4. **Configure Employee-Specific Access** (Optional)
   - Within department permissions, click "Select Employees"
   - Choose specific employees the super user can access
   - Set view and edit permissions individually
   - This provides granular control beyond department-level access

5. **Review and Save**
   - Review the granted permissions
   - Click "Save Permissions" to apply changes
   - Changes take effect immediately

### Permission Inheritance

- **Admin**: Automatic access to everything (no configuration needed)
- **Super User**: Only accesses assigned departments/employees
- **Simple User**: Only accesses own data (no configuration needed)

## Security Features

### Row-Level Security (RLS)

All data access is enforced at the database level:

- Simple users can only query their own records
- Super users can only query assigned departments/employees
- Admins can query all records
- Database functions validate permissions on every query

### Audit Trail

All permission changes are logged:

- Who granted the permission
- What permissions were granted
- When the change was made
- Which user received the permissions

### Data Filtering

- Frontend filters available options based on permissions
- Backend validates all operations against user permissions
- Direct URL access is blocked for unauthorized data
- API calls are validated before executing

## Navigation and UI

### Sidebar Menu

The sidebar dynamically shows only relevant menu items:

**Simple User Menu:**
- Dashboard (personal stats)
- My Attendance
- My Leaves
- My Expenses
- My Performance
- Notifications
- Settings

**Super User Menu:**
- Dashboard (team stats)
- Employees (accessible only)
- My Attendance
- My Leaves
- My Expenses
- My Performance
- Payroll (if granted permission)
- Recruitment (if granted permission)
- Notifications
- Settings

**Admin Menu:**
- Dashboard (organization stats)
- Employees (all)
- My Attendance
- My Leaves
- My Expenses
- My Performance
- Payroll
- Recruitment
- Departments
- User Management
- Activity Logs
- Notifications
- Settings

## Best Practices

### For Admins

1. **Principle of Least Privilege**
   - Grant only necessary permissions
   - Start with view-only access
   - Add management permissions as needed

2. **Regular Permission Reviews**
   - Audit super user permissions quarterly
   - Remove access when roles change
   - Document why permissions were granted

3. **Department-First Approach**
   - Use department-level permissions for most cases
   - Reserve employee-specific permissions for exceptions
   - Keeps configuration manageable

4. **Clear Role Assignments**
   - Don't mix simple users and super users unnecessarily
   - Promote only when management duties are required
   - Keep admin roles limited to IT/HR leadership

### For Super Users

1. **Respect Access Boundaries**
   - Only access data you're assigned to manage
   - Don't request broader access without justification
   - Report any permission issues to admins

2. **Data Privacy**
   - Handle employee data responsibly
   - Don't share sensitive information inappropriately
   - Follow organizational privacy policies

### For Simple Users

1. **Self-Service**
   - Keep personal information up to date
   - Submit requests promptly
   - Check dashboard regularly for status updates

## Troubleshooting

### "No employees found" or Empty Lists

**For Super Users:**
- Contact admin to verify department permissions are assigned
- Check if you have view permissions for the department
- Ensure employees exist in your assigned departments

### "Permission Denied" Errors

- Your role may not have required permissions
- Contact admin to request necessary access
- Verify you're accessing data within your scope

### Changes Not Reflected

- Sign out and sign back in
- Clear browser cache
- Contact admin if issue persists

## Technical Implementation

### Database Functions

- `user_can_access_employee(user_id, employee_id)`: Checks view access
- `user_can_edit_employee(user_id, employee_id)`: Checks edit access
- `get_user_accessible_employees(user_id)`: Returns accessible employee IDs
- `user_has_department_permission(user_id, department_id, permission)`: Checks specific permission

### Permission Tables

- `user_department_permissions`: Department-level access grants
- `user_employee_permissions`: Employee-level access grants
- `permissions`: Available permission definitions
- `role_permissions`: Default permissions per role

### Frontend Permission Utilities

Located in `src/lib/permissions.ts`:

- `isAdmin(role)`: Check if user is admin
- `isSuperUser(role)`: Check if user is super user
- `isSimpleUser(role)`: Check if user is simple user
- `getUserAccessibleEmployeeIds(userId)`: Get employee access list
- `canUserAccessEmployee(userId, employeeId)`: Check employee access
- `canUserEditEmployee(userId, employeeId)`: Check employee edit rights

## Migration Notes

**Existing Roles Mapped:**
- `employee` → `simple_user`
- `manager` → `super_user`
- `hr_manager` → `super_user`
- `admin` → `admin` (unchanged)

Former managers and HR managers are now super users and need permissions configured by admins.

## Support

For permission-related issues:
1. Check this guide for your role's capabilities
2. Verify you're signed in with correct account
3. Contact your administrator for access requests
4. Review activity logs (admins only) for audit trail

---

**Last Updated:** October 2025
**Version:** 1.0
