# Comprehensive Attendance System Guide

## Overview

The attendance system is a fully integrated, enterprise-grade solution that combines biometric device management, real-time attendance tracking, leave management integration, and automated absence processing.

## Key Features

### 1. **Attendance Dashboard** 📊
- **Real-time Statistics**: Present, absent, late arrivals, and leaves
- **Employee Summary**: Personal attendance metrics for the month
  - Present/absent days
  - Leaves taken
  - Late arrivals
  - Average hours per day
  - Total overtime
  - Attendance rate
- **Monthly Trends**: Visual representation of attendance patterns
- **Recent Activity**: Live feed of check-ins and check-outs

### 2. **Daily View** 📅
- **Quick Check-in/Check-out**: Self-service attendance marking
- **Today's Status**: View current attendance status
- **Date-wise Records**: Filter and view attendance by date
- **Employee Details**: See all employees' attendance for selected date
- **Entry Source Tracking**:
  - Biometric device (fingerprint)
  - Manual entry by admin/manager
- **Edit Permissions**: Role-based editing capabilities

### 3. **Live Logs** 🔴
- **Real-time Attendance Feed**: See attendance as it happens
- **Biometric Device Integration**: Syncs directly from fingerprint devices
- **Detailed Information**:
  - Employee name and number
  - Check-in/check-out timestamps
  - Device used
  - Verification method
  - Sync status

### 4. **Absence Management** ⚠️
- **Automatic Detection**: System auto-detects employees who didn't check in
- **Leave Integration**: Syncs with leave management system
- **Auto-deduction**: Automatically deducts from leave balance
- **Statistics**:
  - Total absences
  - Leave deducted count
  - Pending absences
  - Total days deducted
- **Manual Processing**: Process yesterday's absences on-demand
- **Absence Records**: Detailed tracking of all absences
- **Remove Function**: Admin can remove incorrect absence records

### 5. **Schedule Management** 📋
- **Employee Schedules**: Set working hours for each employee
- **Day-wise Configuration**: Different schedules for different days
- **Working/Non-working Days**: Mark weekends and holidays
- **Bulk Management**: Apply schedules to multiple employees
- **Conflict Detection**: Prevents scheduling conflicts

### 6. **Biometric Device Management** 🖐️
- **Device Registration**: Add and configure fingerprint devices
- **Connection Monitoring**: Track device online/offline status
- **Sync Management**: Auto-sync or manual sync options
- **Device Stats**: Current users, fingerprints, and storage
- **Multiple Protocols**: Support for various device types

### 7. **Biometric Enrollment** 👤
- **Employee Enrollment**: Register employees on biometric devices
- **Fingerprint Management**: Enroll multiple fingerprints per employee
- **Device Assignment**: Assign employees to specific devices
- **Enrollment Status**: Track enrollment completion

## How It Works

### Attendance Flow

```
1. Employee arrives → Fingerprints on device
2. Device captures → Sends data to bridge service
3. Bridge syncs → Supabase database
4. System creates → Attendance record
5. Dashboard updates → Real-time statistics
```

### Leave Integration Flow

```
1. Employee requests leave
2. Manager/Admin approves
3. System auto-creates attendance records for leave period
4. Attendance marked as "leave" for those dates
5. Leave balance updated
```

### Absence Processing Flow

```
1. Daily cron job runs at midnight (or manual trigger)
2. System checks scheduled employees
3. Identifies who didn't check in
4. Excludes employees on approved leave
5. Creates absence records
6. Deducts 1 day from leave balance
7. Marks attendance as "absent"
8. Sends notifications (if configured)
```

## Database Schema

### Core Tables

#### `attendance`
- Stores all check-in/check-out records
- Links to employees, devices, and schedules
- Tracks entry source (biometric/manual)
- Includes verification details

#### `attendance_summary`
- Daily summary per employee
- Calculates late arrivals, early leaves, overtime
- Links to schedules for comparison
- Marks leaves and weekends

#### `attendance_schedules`
- Employee work schedules
- Day-wise configuration (0-6 = Sun-Sat)
- Check-in/check-out times
- Working day flags

#### `absence_records`
- Tracks all detected absences
- Links to leave types
- Stores deduction details
- Processing timestamps

#### `biometric_devices`
- Device information and configuration
- Connection status
- Sync settings
- Capacity and usage stats

### Integration Tables

#### `leave_requests`
- Leave applications
- Approval workflow
- Date ranges
- Status tracking

#### `leave_balances`
- Employee leave balances
- Year-wise allocation
- Used and remaining days
- Auto-updated by absence system

## Usage Instructions

### For Employees

**Check In/Out:**
1. Go to Attendance → Dashboard
2. View your today's status card
3. Click "Check In" button when arriving
4. Click "Check Out" button when leaving
5. Or use biometric device for automatic tracking

**View Your Stats:**
1. Go to Attendance → Dashboard
2. Select month from dropdown
3. View your personal attendance summary
4. Check present days, absences, leaves, and overtime

### For Managers

**View Team Attendance:**
1. Go to Attendance → Dashboard
2. See team-wide statistics
3. View recent activity feed
4. Monitor late arrivals and absences

**Manage Schedules:**
1. Go to Attendance → Schedules tab
2. Create or edit employee schedules
3. Set working hours for each day
4. Mark weekends and holidays

**Manual Entry:**
1. Go to Attendance → Daily View
2. Click "Manual Entry" button
3. Select employee, date, and times
4. Add notes if needed
5. Save entry

### For Admins

**Process Absences:**
1. Go to Attendance → Absences tab
2. Click "Process Yesterday" button
3. System detects missing check-ins
4. Auto-deducts from leave balance
5. View absence records table

**Manage Devices:**
1. Go to Attendance → Devices tab
2. Add new biometric devices
3. Configure connection settings
4. Monitor online/offline status
5. Trigger manual sync if needed

**Employee Enrollment:**
1. Go to Attendance → Enrollment tab
2. Select employee to enroll
3. Choose device
4. Follow device instructions to capture fingerprint
5. Verify enrollment success

## Automation Features

### Daily Absence Processing
- **Schedule**: Runs automatically at midnight
- **Manual Trigger**: "Process Yesterday" button in Absences tab
- **Logic**:
  - Checks yesterday's schedules
  - Finds employees without attendance record
  - Excludes those on approved leave
  - Creates absence record
  - Deducts 1 day from annual/casual leave
  - Marks attendance as "absent"

### Leave Approval Integration
- **Automatic**: When leave is approved
- **Action**:
  - Creates attendance records for entire leave period
  - Marks status as "leave"
  - Links to leave type
  - Prevents absence deduction for those dates

### Attendance Summary Calculation
- **Trigger**: After every attendance entry
- **Calculates**:
  - Late arrival (minutes)
  - Early departure (minutes)
  - Total hours worked
  - Overtime (if any)
  - Compares with schedule

### Biometric Sync
- **Real-time**: If device supports push
- **Scheduled**: Every X minutes (configurable)
- **Manual**: On-demand sync button
- **Process**:
  - Fetches new attendance logs from device
  - Creates attendance records
  - Updates device statistics
  - Marks sync status

## API Endpoints

### Edge Functions

#### `process-daily-attendance`
- **Method**: POST
- **Auth**: Required (JWT)
- **Purpose**: Process absences for previous day
- **Response**: Success status and processing details
- **Usage**: Called by cron job or manual trigger

#### `biometric-sync`
- **Method**: POST
- **Auth**: Required (JWT)
- **Purpose**: Sync attendance from biometric devices
- **Payload**: Device ID and date range
- **Response**: Synced records count

#### `biometric-device-connect`
- **Method**: POST
- **Auth**: Required (JWT)
- **Purpose**: Test device connection
- **Response**: Connection status and device info

#### `biometric-device-enroll`
- **Method**: POST
- **Auth**: Required (JWT)
- **Purpose**: Enroll employee fingerprint on device
- **Payload**: Employee ID, device ID, finger index
- **Response**: Enrollment status

## Reports & Analytics

### Available Reports

1. **Attendance Summary Report**
   - Date range selection
   - Employee/department filters
   - Present, absent, late statistics
   - Export to CSV/PDF

2. **Late Arrivals Report**
   - Employees consistently late
   - Average late time
   - Trend analysis

3. **Absence Report**
   - Absence patterns
   - Leave deductions
   - Department-wise breakdown

4. **Overtime Report**
   - Overtime hours by employee
   - Department totals
   - Cost calculations

5. **Monthly Summary**
   - Attendance rate
   - Average working hours
   - Leave utilization
   - Trend graphs

## Best Practices

### For Admins

1. **Set Up Schedules First**: Before starting attendance tracking
2. **Enroll All Employees**: Ensure everyone has biometric enrollment
3. **Monitor Daily**: Check dashboard daily for anomalies
4. **Process Absences**: Run daily or enable auto-processing
5. **Regular Audits**: Review absence records monthly
6. **Backup Data**: Export reports regularly
7. **Update Schedules**: Keep working hours current

### For Employees

1. **Check In On Time**: Use biometric device upon arrival
2. **Check Out Daily**: Don't forget to check out
3. **Review Your Stats**: Monitor your attendance regularly
4. **Report Issues**: Notify admin of device problems
5. **Apply Leave in Advance**: Ensure leaves are approved

### System Maintenance

1. **Device Health**: Monitor device connectivity
2. **Data Cleanup**: Archive old records periodically
3. **Performance**: Monitor query performance
4. **Sync Status**: Ensure devices are syncing properly
5. **Updates**: Keep biometric bridge service updated

## Troubleshooting

### Common Issues

**Issue**: Employee marked absent but was present
- **Solution**: Check if they used correct device
- **Action**: Admin can manually add/edit attendance
- **Prevention**: Ensure proper enrollment

**Issue**: Late marked incorrectly
- **Solution**: Verify schedule is correct
- **Action**: Edit schedule or attendance record
- **Prevention**: Double-check schedule setup

**Issue**: Device not syncing
- **Solution**: Check network connectivity
- **Action**: Restart bridge service
- **Prevention**: Monitor device status regularly

**Issue**: Leave deduction not working
- **Solution**: Verify leave balance exists
- **Action**: Manually create leave allocation
- **Prevention**: Set up annual allocations upfront

**Issue**: Duplicate attendance records
- **Solution**: Check for multiple check-ins
- **Action**: Delete duplicate entries
- **Prevention**: Configure device to prevent duplicates

## Security & Permissions

### Role-Based Access

**Admin:**
- Full access to all features
- Can edit any attendance
- Can process absences
- Can manage devices
- Can enroll employees

**Manager:**
- View team attendance
- Edit team attendance
- View team schedules
- Cannot manage devices
- Cannot process absences

**Employee:**
- View own attendance only
- Self check-in/check-out
- View own statistics
- Cannot edit records
- Cannot access others' data

### Data Protection

- **RLS Enabled**: All tables use Row Level Security
- **Encrypted Data**: Sensitive data encrypted at rest
- **Audit Trail**: All changes logged
- **Access Logs**: Login and action tracking
- **Fingerprint Data**: Never stored in database (only on device)

## Performance Optimization

1. **Indexes**: Created on frequently queried columns
2. **Materialized Views**: For complex reports
3. **Caching**: Dashboard statistics cached
4. **Pagination**: Large datasets paginated
5. **Lazy Loading**: Components load on demand

## Future Enhancements

- [ ] Mobile app for attendance
- [ ] GPS-based attendance
- [ ] Face recognition integration
- [ ] Advanced analytics with ML
- [ ] Shift management
- [ ] Overtime approval workflow
- [ ] Integration with payroll
- [ ] Notification system
- [ ] Custom report builder
- [ ] Multi-location support

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console
3. Contact system administrator
4. Check database logs in Supabase dashboard

---

**System Version**: 1.0.0
**Last Updated**: November 2025
**Compatibility**: Chrome, Firefox, Safari, Edge
