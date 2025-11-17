# Login Credential Management System

## Overview
Administrators have full control over employee login credentials, including the ability to update email addresses and reset passwords for any user in the system.

---

## Features

### 1. Email Address Management
Admins can change a user's email address, which updates their login credentials immediately.

### 2. Password Reset
Admins can generate new passwords for users without requiring the old password.

### 3. Security & Audit Trail
All credential changes are logged in the activity log for security and compliance.

---

## How to Manage Login Credentials

### Accessing Credential Management

1. **Navigate to User Management**
   - Click "User Management" in the sidebar
   - View the list of all users

2. **Locate User Actions**
   - Find the user whose credentials you want to manage
   - Look for the "Actions" column on the right side

3. **Available Buttons**
   - **Email** (Blue) - Change user's email address
   - **Password** (Red) - Reset user's password

---

## Changing a User's Email Address

### Step-by-Step Process

1. **Click the "Email" Button**
   - Opens the email update modal
   - Shows current email address (read-only)

2. **Enter New Email**
   - Type the new email address
   - Must be valid email format
   - Cannot be already in use by another user

3. **Review Information**
   - Modal shows a notification:
     > "The user will need to use this new email address to log in. They will remain logged in on existing sessions."

4. **Click "Update Email"**
   - System validates the email
   - Updates authentication system
   - Updates database records
   - Logs the change in activity log

5. **Success**
   - Green success message appears
   - User list refreshes automatically
   - User can now log in with new email

### Email Update Rules

✅ **Allowed:**
- Valid email format (user@domain.com)
- Unique email (not used by other users)
- Any domain (no restrictions)

❌ **Not Allowed:**
- Invalid email format
- Email already in use
- Empty email field
- Same as current email

### Technical Details

**Backend:** Edge function `admin-update-user-email`
- Validates admin permissions
- Checks email availability
- Updates auth.users table
- Updates public.users table
- Logs activity for audit

**Security:**
- Only admins can update emails
- Requires valid session token
- All changes are logged
- Email uniqueness enforced

---

## Resetting a User's Password

### Step-by-Step Process

1. **Click the "Password" Button**
   - Opens the password reset modal
   - Shows user name at top

2. **Enter New Password**
   - Type new password (minimum 6 characters)
   - Enter confirmation password
   - Both must match

3. **Review Warning**
   - Modal shows important notification:
     > "The user will be able to log in immediately with this new password. Consider sharing it securely."

4. **Click "Reset Password"**
   - System validates passwords match
   - Updates authentication system
   - Logs the change
   - Password takes effect immediately

5. **Share Credentials Securely**
   - Copy the password you set
   - Share with user through secure channel
   - Consider using password manager or encrypted message

### Password Reset Rules

✅ **Allowed:**
- Minimum 6 characters
- Any combination of characters
- Can include special characters
- No maximum length

❌ **Not Allowed:**
- Less than 6 characters
- Passwords don't match
- Empty password field

### Password Security Best Practices

**When Setting Passwords:**
1. Use strong, unique passwords
2. Include mix of uppercase, lowercase, numbers, symbols
3. Avoid common words or patterns
4. Consider using password generator

**When Sharing Passwords:**
1. Use encrypted messaging (Signal, etc.)
2. Share through password manager
3. Never email passwords in plain text
4. Ask user to change password after first login

### Technical Details

**Backend:** Edge function `admin-reset-user-password`
- Validates admin permissions
- Validates password requirements
- Updates auth.users password hash
- Logs activity for audit
- No email notification sent

**Security:**
- Only admins can reset passwords
- Requires valid session token
- All changes are logged
- Password hashed before storage

---

## Use Cases

### Use Case 1: Employee Changed Email

**Scenario:**
Employee Sarah got married and wants to change her email from sarah.jones@company.com to sarah.smith@company.com

**Steps:**
1. Sarah requests email change
2. Admin clicks "Email" button for Sarah
3. Enter new email: sarah.smith@company.com
4. Click "Update Email"
5. Inform Sarah she can now log in with new email

**Result:**
- Sarah can log in with sarah.smith@company.com
- Old email no longer works
- All her data remains intact

---

### Use Case 2: Employee Forgot Password

**Scenario:**
John can't remember his password and needs access urgently.

**Steps:**
1. John contacts admin
2. Admin clicks "Password" button for John
3. Admin generates strong password: "TempPass2024!"
4. Clicks "Reset Password"
5. Securely shares password with John
6. Asks John to change it after logging in

**Result:**
- John can log in immediately
- Admin action is logged
- John should change password ASAP

---

### Use Case 3: Onboarding New Employee

**Scenario:**
New employee Lisa needs login credentials on day one.

**Steps:**
1. HR creates employee record
2. System auto-generates user account
3. Admin clicks "Password" button
4. Sets temporary password: "Welcome2024!"
5. Shares credentials with Lisa
6. Lisa logs in and changes password

**Result:**
- Lisa has immediate access
- Credentials are secure
- System is ready for day one

---

### Use Case 4: Security Incident

**Scenario:**
Mark's account may have been compromised.

**Steps:**
1. Security team notifies admin
2. Admin immediately resets Mark's password
3. Generates new strong password
4. Contacts Mark through verified channel
5. Shares new password securely
6. Mark logs in and changes password again

**Result:**
- Account secured immediately
- Old password invalidated
- Security incident contained
- All actions logged

---

### Use Case 5: Employee Left Email Typo

**Scenario:**
During account creation, email was entered as "john@compny.com" instead of "john@company.com"

**Steps:**
1. Admin notices typo
2. Clicks "Email" button
3. Corrects to john@company.com
4. Clicks "Update Email"
5. Employee can now receive emails

**Result:**
- Email corrected immediately
- Employee can log in
- Email notifications work properly

---

## Activity Logging

All credential changes are automatically logged:

### Email Changes Log Entry
```json
{
  "action": "update",
  "resource_type": "user_email",
  "resource_id": "user-uuid",
  "changes": {
    "new_email": "new.email@company.com",
    "updated_by": "admin@company.com"
  }
}
```

### Password Resets Log Entry
```json
{
  "action": "update",
  "resource_type": "user_password",
  "resource_id": "user-uuid",
  "changes": {
    "target_user": "user@company.com",
    "target_name": "User Name",
    "reset_by": "admin@company.com"
  }
}
```

---

## Security Considerations

### Who Can Manage Credentials?

**Only Administrators:**
- Admin role required
- Verified by edge functions
- Enforced at multiple layers

**Super Users Cannot:**
- Super users cannot manage credentials
- Only admins have this privilege
- Prevents unauthorized access

### Audit Trail

**Everything is Logged:**
- Who made the change
- What was changed
- When it happened
- Which user was affected

**Compliance:**
- Meet audit requirements
- Track security incidents
- Investigate issues
- Maintain accountability

### Session Management

**Email Changes:**
- Existing sessions remain valid
- User can continue working
- New logins require new email

**Password Changes:**
- Takes effect immediately
- Old password invalidated
- All future logins use new password
- Consider revoking active sessions for security

---

## Troubleshooting

### "Email already in use"

**Problem:** New email exists for another user

**Solution:**
1. Verify the email you're entering
2. Check for typos
3. Search for user with that email
4. Use a different email address

---

### "Failed to update email"

**Problem:** Edge function error or validation issue

**Solution:**
1. Check email format is valid
2. Verify you're logged in as admin
3. Check browser console for errors
4. Try logging out and back in
5. Contact support if persists

---

### "Password too short"

**Problem:** Password doesn't meet minimum requirements

**Solution:**
1. Ensure password is at least 6 characters
2. Consider using longer password (8-12 chars)
3. Try again with longer password

---

### "Passwords don't match"

**Problem:** Password and confirmation don't match

**Solution:**
1. Carefully re-enter both passwords
2. Check for extra spaces
3. Verify caps lock is off
4. Copy/paste both fields if needed

---

### "Session expired"

**Problem:** Admin session timed out

**Solution:**
1. Log out completely
2. Log back in
3. Try credential update again
4. Session should be fresh

---

## API Reference

### Update User Email

**Endpoint:** `POST /functions/v1/admin-update-user-email`

**Authentication:** Bearer token (Admin only)

**Request Body:**
```json
{
  "userId": "uuid-of-user",
  "newEmail": "new.email@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email updated successfully",
  "user": { /* user object */ }
}
```

---

### Reset User Password

**Endpoint:** `POST /functions/v1/admin-reset-user-password`

**Authentication:** Bearer token (Admin only)

**Request Body:**
```json
{
  "userId": "uuid-of-user",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "user": { /* user object */ }
}
```

---

## Best Practices Summary

### For Admins

✅ **Do:**
- Use strong passwords when resetting
- Share credentials securely
- Document why changes were made
- Ask users to change temporary passwords
- Log out user sessions after password reset (if security incident)

❌ **Don't:**
- Share passwords via email
- Use simple passwords
- Reuse passwords across users
- Skip documentation
- Ignore security incidents

### For Organizations

✅ **Do:**
- Implement password change policy
- Train admins on secure practices
- Review audit logs regularly
- Document credential management procedures
- Use password managers

❌ **Don't:**
- Allow weak passwords
- Skip audit reviews
- Share admin credentials
- Ignore security alerts
- Forget to update procedures

---

## Support & Questions

For issues or questions about credential management:
1. Check this documentation
2. Review error messages carefully
3. Check activity logs for clues
4. Verify admin permissions
5. Contact system administrator

---

**Last Updated:** October 23, 2025  
**Version:** 1.0  
**Feature Status:** ✅ ACTIVE & TESTED
