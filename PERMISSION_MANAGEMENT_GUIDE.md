# Permission Management System - Complete Guide

## Overview
The HR Portal includes a sophisticated permission management system that allows administrators to configure granular access control for super users on a per-department and per-employee basis.

---

## Accessing Permission Management

### 1. Navigate to User Management
- Click **User Management** from the sidebar
- View the list of all users in the system

### 2. Find the User to Configure
- Use the search bar to find specific users
- Filter by role (Admin, Super User, Employee)
- Sort by any column

### 3. Open Permissions Interface
- Click the **"Permissions"** button next to any Super User or Admin
- The button is only available for users with elevated roles
- Simple users don't have configurable permissions

---

## Department-Level Permissions

### Opening the Department Permissions Modal

When you click "Permissions" on a Super User, you'll see the Department Permissions interface with all available departments.

### Available Permission Categories

#### 1. Employee Management
**View Employees**
- Allows viewing employee profiles, contact information, and basic details
- Required for seeing employee lists in the department

**Edit Employees**
- Allows modifying employee information, positions, and status
- Includes updating contact details, employment info, salary
- Automatically grants View permission

#### 2. Attendance Management
**View Attendance**
- View attendance records, check-in/out times, and attendance reports
- See attendance statistics and trends
- Access attendance logs and history

**Manage Attendance**
- Mark attendance (present, absent, late, half-day)
- Edit existing attendance records
- Override system-generated attendance
- Automatically grants View permission

#### 3. Leave Management
**View Leave Requests**
- View all leave requests from department employees
- See leave balances and history
- Access leave type configurations

**Approve Leaves**
- Approve or reject leave requests
- Add approval notes and comments
- Modify leave status
- Automatically grants View permission

#### 4. Payroll Management
**View Payroll**
- View salary information for department employees
- See payslips and payment history
- Access payroll reports and summaries

**Manage Payroll**
- Generate payslips for employees
- Process payroll for the department
- Modify payroll components
- Automatically grants View permission

#### 5. Expense Management
**View Expenses**
- View expense claims from department employees
- See expense reports and summaries
- Access expense history and categories

**Approve Expenses**
- Approve or reject expense claims
- Add approval notes
- Request additional information
- Automatically grants View permission

#### 6. Performance Management
**View Performance**
- View performance reviews and ratings
- See performance history and trends
- Access goals and objectives

**Manage Performance**
- Create new performance reviews
- Edit existing reviews
- Set goals and objectives
- Automatically grants View permission

---

## Employee-Level Permissions

### When to Use Employee-Level Permissions

Use employee-level permissions when you need:
- More granular control than department-level
- To limit a super user to specific team members
- To give access to select employees across departments
- To create custom access patterns

### Opening Employee Permissions

1. Open Department Permissions for a user
2. Select a department
3. Click **"Select Employees"** button for that department
4. The Employee Permissions modal opens

### Configuring Employee Access

For each employee in the department, you can set:

**View Permission**
- User can see the employee's basic information
- View their attendance, leaves, expenses
- See their performance reviews

**Edit Permission**
- User can modify the employee's information
- Approve their requests
- Manage their records
- Automatically grants View permission

### Bulk Operations

**Select All**
- Quickly grant access to all employees in department
- Default: View only
- Edit must be enabled individually

**Clear All**
- Remove all employee-level permissions
- Reverts to department-level permissions

**Search**
- Find specific employees by name, ID, or position
- Filter the employee list dynamically

---

## Permission Flow & Hierarchy

### How Permissions Work Together

```
┌─────────────────────────────────────────────┐
│           ADMINISTRATOR (Admin)              │
│         ✓ Full Access to Everything         │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│          SUPER USER (Super User)             │
│    ✓ Access to Assigned Departments Only    │
└─────────────────────────────────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
┌───────────────────┐    ┌────────────────────┐
│ Department-Level  │    │  Employee-Level    │
│   Permissions     │    │   Permissions      │
│                   │    │                    │
│ • View Employees  │    │ • View Employee X  │
│ • Edit Employees  │    │ • Edit Employee X  │
│ • Manage Leaves   │    │ • View Employee Y  │
│ • Approve Expenses│    │ (No Edit for Y)    │
└───────────────────┘    └────────────────────┘
```

### Permission Inheritance

- **Admin** → Bypasses all permission checks, full access
- **Super User + Department Permission** → Access all employees in department
- **Super User + Employee Permission** → Access specific employees only
- **No Permission** → No access (even if role is Super User)

### Combining Permissions

- Department-level permissions apply to ALL employees in department
- Employee-level permissions override for specific employees
- If both exist, employee-level is MORE restrictive

**Example:**
- Department permission: View Employees = YES
- Employee permission: Can view Employee A = YES, Can view Employee B = NO
- Result: Can view only Employee A from that department

---

## Practical Scenarios

### Scenario 1: Team Lead Managing Their Team

**Requirement:** 
John is a team lead who needs to manage attendance and approve leaves for his 10-person team in the Engineering department.

**Configuration:**
1. Set John's role to **Super User**
2. Click **Permissions** → Add Engineering department
3. Enable:
   - ✓ View Attendance
   - ✓ Manage Attendance
   - ✓ View Leave Requests
   - ✓ Approve Leaves
4. Leave employee permissions empty (access all 10 people)

**Result:**
- John can mark attendance for his entire team
- John can approve/reject leave requests
- John cannot see salaries or process payroll
- John cannot see other departments

---

### Scenario 2: HR Specialist for Specific Departments

**Requirement:**
Sarah handles payroll and expenses for Marketing and Sales departments only.

**Configuration:**
1. Set Sarah's role to **Super User**
2. Click **Permissions** → Add Marketing department
3. Enable:
   - ✓ View Payroll
   - ✓ Manage Payroll
   - ✓ View Expenses
   - ✓ Approve Expenses
4. Repeat for Sales department

**Result:**
- Sarah can process payroll for Marketing and Sales
- Sarah can approve expense claims
- Sarah cannot access Engineering or other departments
- Sarah cannot edit employee records

---

### Scenario 3: Project Manager with Mixed Team

**Requirement:**
Mike manages a cross-functional project with 3 developers from Engineering and 2 designers from Design department.

**Configuration:**
1. Set Mike's role to **Super User**
2. Click **Permissions** → Add Engineering department
3. Click **"Select Employees"**
4. Select only the 3 developers → Enable View & Edit
5. Repeat for Design department, select 2 designers

**Result:**
- Mike can only see his 5 team members
- Mike cannot see other employees in Engineering or Design
- Mike can manage attendance and performance for his team
- Mike has no access to payroll

---

### Scenario 4: Senior Manager Overseeing Multiple Teams

**Requirement:**
Lisa oversees 4 departments and needs view-only access to monitor everything but approve critical requests.

**Configuration:**
1. Set Lisa's role to **Super User**
2. Add all 4 departments
3. For each department, enable:
   - ✓ View Employees
   - ✓ View Attendance
   - ✓ View Leave Requests
   - ✓ Approve Leaves (critical)
   - ✓ View Expenses
   - ✓ Approve Expenses (critical)
   - ✓ View Performance

**Result:**
- Lisa has visibility across all 4 departments
- Lisa can approve leaves and expenses
- Lisa cannot edit employee records or process payroll
- Lisa can monitor performance across teams

---

## Best Practices

### 1. Start with Minimal Permissions
- Grant only what's necessary
- Add permissions as needs are identified
- Review periodically

### 2. Use Department-Level for Most Cases
- Easier to manage
- Scales better
- Clearer permission structure

### 3. Reserve Employee-Level for Exceptions
- Cross-functional teams
- Special projects
- Temporary access needs

### 4. Document Why Permissions Were Granted
- Note in activity logs
- Track permission changes
- Review quarterly

### 5. Test After Granting Permissions
- Ask the user to verify access
- Check that restrictions work
- Ensure no over-permissions

### 6. Regular Audits
- Review super user permissions monthly
- Remove unnecessary access
- Update based on role changes

---

## Permission Matrix

| Action | Admin | Super User (w/ Permission) | Super User (w/o Permission) | Simple User |
|--------|-------|---------------------------|----------------------------|-------------|
| View all employees | ✓ | ✓ (dept only) | ✗ | ✗ |
| Edit any employee | ✓ | ✓ (if enabled) | ✗ | ✗ |
| View own info | ✓ | ✓ | ✓ | ✓ |
| Approve leaves | ✓ | ✓ (if enabled) | ✗ | ✗ |
| Process payroll | ✓ | ✓ (if enabled) | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ | ✗ |
| Configure permissions | ✓ | ✗ | ✗ | ✗ |

---

## Troubleshooting

### "I don't see any employees"
**Solution:** Admin needs to grant department permissions
1. Contact your administrator
2. They should add departments to your account
3. Log out and log back in

### "I can't approve this leave request"
**Solution:** Check if approval permission is enabled
- You need "Approve Leaves" permission for that department
- Or employee-level edit permission for that specific employee

### "Permission button is grayed out"
**Solution:** Only available for Super Users
- Simple users don't have configurable permissions
- Admin role has all permissions by default
- Change user role to Super User first

### "Changes don't take effect"
**Solution:** Clear session and re-login
1. Click logout
2. Clear browser cache
3. Login again
4. Check if permissions now work

---

## Technical Details

### Database Tables

**user_department_permissions**
- Stores department-level access grants
- 12 boolean permission columns
- Links user to department

**user_employee_permissions**
- Stores employee-level access grants
- 2 boolean columns (view, edit)
- Links user to specific employee

### RLS Policies

All data access is enforced at database level:
- Simple users: Only own data
- Super users: Assigned departments/employees only
- Admins: All data

### Security Functions

- `has_department_access(dept_id, permission_type)`
- `has_employee_access(emp_id, permission_type)`
- `is_admin()` - Check admin status
- `is_super_user()` - Check super user status

---

## Support

For permission-related issues:
1. Check this guide for proper configuration steps
2. Verify user has Super User role
3. Ensure departments are assigned
4. Check if specific permission is enabled
5. Contact administrator for access requests

---

**Last Updated:** October 23, 2025  
**Version:** 2.0  
**System Status:** ✅ FULLY OPERATIONAL
