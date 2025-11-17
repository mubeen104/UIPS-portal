# Connect Your ZKTeco K40 - Start Here!

Your system is now ready to connect to your ZKTeco K40 device using real ZKTeco protocol.

## What Changed

Your biometric bridge service has been upgraded with:
- ✅ **node-zklib** - Real ZKTeco protocol library installed
- ✅ **Real connection testing** - Actually communicates with K40
- ✅ **Real fingerprint enrollment** - Captures actual fingerprints
- ✅ **Real attendance sync** - Pulls actual records from K40
- ✅ **Connection management** - Proper socket handling and cleanup
- ✅ **Employee mapping** - Maps K40 UIDs to your employees

## Your Next Steps

### Step 1: Get K40 Ready (2 minutes)

On your K40 device:

1. Press **MENU** button
2. Go to: **Communication** → **Network Settings**
3. Write down:
   - **IP Address**: `___.___.___.___`
   - **Port**: (usually `4370`)
4. Make sure K40 is connected to network (check cable)

### Step 2: Configure Bridge Service (3 minutes)

On the computer where you'll run the bridge:

```bash
cd /path/to/your/project/biometric-bridge

# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

Add your Supabase Service Role Key:

```env
SUPABASE_URL=https://bdzaubmitwvhgwfhkzwo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key-here>
BRIDGE_PORT=3001
NODE_ENV=development
```

**Get Service Role Key:**
1. Go to: https://supabase.com/dashboard/project/bdzaubmitwvhgwfhkzwo/settings/api
2. Find "Service Role Key" section
3. Copy the key (starts with `eyJ...`)
4. Paste it in .env file

### Step 3: Test K40 Connection (1 minute)

```bash
# Make sure you're in biometric-bridge directory
cd biometric-bridge

# Install dependencies if not already done
npm install

# Test your K40 (replace IP with yours)
node test-connection.js 192.168.1.201 4370
```

**Expected Output:**
```
=== ZKTeco K40 Connection Test ===

Testing connection to: 192.168.1.201:4370
Timeout: 10 seconds

Step 1: Creating socket connection...
✓ Socket connected successfully

Step 2: Getting device information...
✓ Device info retrieved:
  Model: K40
  Serial Number: ABC123456
  Firmware: Ver 6.60 Apr 28 2019

Step 3: Getting user count...
✓ Found 5 enrolled users

Step 4: Getting attendance records...
✓ Found 120 attendance records

=== Test Result: SUCCESS ===
```

**If test fails**, see troubleshooting section below.

### Step 4: Start Bridge Service (1 minute)

```bash
npm start
```

**Expected Output:**
```
Biometric Bridge Service Starting...
Environment: development
Port: 3001
ZKTeco SDK: node-zklib loaded

✓ Biometric Bridge Service running on port 3001
✓ ZKTeco SDK: node-zklib enabled
✓ Health check: http://localhost:3001/health

Waiting for device communication requests...
```

**Keep this terminal open!** The bridge must stay running.

### Step 5: Register K40 in Web App (2 minutes)

1. Open your HR application in browser
2. Go to **Biometric** → **Devices** tab
3. Click **"Add Device"** button
4. Fill in the form:

   ```
   Device Name: K40 Main Entrance
   Device ID: K40-001
   Protocol: ZKTeco
   Location: Main Entrance
   IP Address: 192.168.1.201  (your K40's IP)
   Port: 4370
   Auto-Sync: ✓ Enabled
   Sync Interval: 300
   ```

5. Click **"Register Device"**

### Step 6: Test Connection from Web (30 seconds)

1. Find your K40 in the device list
2. Click **"Test"** button
3. Watch the bridge console for output
4. Should see success message in web UI

**Success looks like:**
- Green checkmark on device card
- Status: Online
- Message: "ZKTeco K40 connected successfully. Found X users and Y attendance records."

### Step 7: Enroll First Fingerprint (2 minutes)

1. Go to **Biometric** → **Enrollment** tab
2. Select an employee from dropdown
3. Select your K40 device (must show as online)
4. Click **"Test"** to verify connection
5. Select finger position (e.g., "Right Index")
6. Click **"Start Enrollment"**
7. **Physical action required:** Place finger on K40 scanner
8. Follow K40 voice/beep prompts (usually 3 scans)
9. Wait for success message

**Watch bridge console** for enrollment progress.

### Step 8: Sync Attendance Records (1 minute)

1. Go back to **Biometric** → **Devices** tab
2. Click **"Sync"** button on K40 card
3. Wait for sync to complete
4. Go to **Attendance** tab to see records

**Success:** You should see attendance records from your K40.

## Troubleshooting

### Test Connection Fails

**Error: Connection timeout**

**Cause:** Can't reach K40 on network

**Fix:**
```bash
# Ping K40
ping 192.168.1.201

# If ping fails:
# - Check K40 is powered on
# - Check network cable
# - Verify IP address on K40 menu
# - Make sure computer and K40 on same network
```

**Error: ECONNREFUSED**

**Cause:** Wrong port or K40 service not running

**Fix:**
- Check port on K40: Menu → Communication → Network → Port
- Default is 4370
- Try restarting K40

**Error: EHOSTUNREACH**

**Cause:** Network routing issue

**Fix:**
- Check subnet mask on K40
- Verify K40 and computer on same subnet
- Check router settings

### Bridge Won't Start

**Error: Port 3001 in use**

```bash
# Find what's using port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env
BRIDGE_PORT=3002
```

**Error: Module not found**

```bash
# Reinstall dependencies
npm install
```

### Enrollment Fails

**Problem:** No response from K40

**Checks:**
1. Bridge service running? Check terminal
2. K40 online? Test connection first
3. Finger on scanner? Must physically place finger
4. K40 has memory? Check device capacity

**Bridge logs show:**
```
Starting ZKTeco enrollment for employee...
Setting device to enrollment mode...
```

If stuck here, check finger is on K40 scanner.

### No Attendance Records Sync

**Problem:** Sync completes but no records

**Cause:** Employee ID mapping issue

**Fix:**
1. Check bridge console logs for mapping messages
2. K40 uses numeric UIDs
3. Bridge extracts numbers from employee IDs
4. Example: EMP-001234 → UID 001234

**Check employees table:**
```sql
SELECT id, employee_id FROM employees;
```

Make sure employee_id contains numbers that match K40 UIDs.

### K40 Shows Offline

**Quick Fix:**
1. Check bridge service is running
2. Click "Test" button again
3. Check bridge console for errors
4. Restart bridge service if needed

## Important Notes

### Employee ID Mapping

The K40 uses numeric User IDs (UIDs). The bridge automatically:
- Extracts numbers from your employee IDs
- Uses last 6 digits as UID on K40
- Maps K40 records back to employees

**Example:**
- Employee ID: `EMP-001234` → K40 UID: `001234`
- Employee ID: `STAFF-789` → K40 UID: `789`

### Keep Bridge Running

The bridge service must be running for:
- Device connection tests
- Fingerprint enrollment
- Attendance sync
- Auto-sync (every 5 minutes)

**For production:** Set up bridge as a service (see K40_SETUP_GUIDE.md)

### Network Requirements

- Bridge computer and K40 must be on same network
- Port 4370 must not be blocked by firewall
- K40 should have static IP (not DHCP)

### Auto-Sync

Once device is registered and online:
- Auto-sync runs every 5 minutes (configurable)
- Fetches new attendance records automatically
- Filters out duplicates
- No manual action needed

## Files You Need to Know

### Configuration
- `biometric-bridge/.env` - Your credentials (create this!)
- `biometric-bridge/.env.example` - Template

### Documentation
- `biometric-bridge/K40_SETUP_GUIDE.md` - Complete detailed guide
- `biometric-bridge/README.md` - Bridge service documentation
- `FINGERPRINT_DEVICE_SETUP.md` - General device guide

### Tools
- `biometric-bridge/test-connection.js` - K40 connection tester
- `biometric-bridge/index.js` - Main bridge service

## Quick Reference

### Bridge Commands

```bash
cd biometric-bridge

# Start bridge
npm start

# Test K40 connection
node test-connection.js <ip> <port>

# Check bridge health
curl http://localhost:3001/health
```

### K40 Default Settings

- Default Port: `4370`
- Protocol: TCP/IP
- Admin Password: `0` (default)

### URLs

- Bridge: `http://localhost:3001`
- Health: `http://localhost:3001/health`
- Supabase: `https://bdzaubmitwvhgwfhkzwo.supabase.co`

## Success Checklist

- [ ] K40 IP address identified
- [ ] Bridge .env file configured with Service Role Key
- [ ] test-connection.js succeeds
- [ ] Bridge service running
- [ ] K40 registered in web UI
- [ ] Test connection succeeds (shows green/online)
- [ ] First fingerprint enrolled
- [ ] Attendance records sync successfully
- [ ] Can see attendance in web UI

## Need More Help?

### Detailed Guides
- Read `biometric-bridge/K40_SETUP_GUIDE.md` for complete instructions
- Check `FINGERPRINT_DEVICE_SETUP.md` for general troubleshooting

### Check Logs
- **Bridge logs:** See terminal where bridge is running
- **Browser logs:** Press F12, check Console tab
- **Device logs:** Check K40 display for errors

### Common Problems and Solutions

| Problem | Quick Fix |
|---------|-----------|
| Can't ping K40 | Check network cable, verify IP |
| Port 3001 in use | Change port in .env or kill process |
| Connection timeout | Verify K40 IP, check firewall |
| Enrollment no response | Place finger on scanner, check K40 display |
| No records sync | Check employee ID mapping in logs |

## What's Next?

After successful setup:

1. **Enroll all employees**
   - Go through enrollment process for each employee
   - Use different fingers if needed
   - Verify enrollment success

2. **Test attendance**
   - Have employees scan fingerprints on K40
   - Check attendance records appear in web UI
   - Verify auto-sync is working

3. **Production setup**
   - Set up bridge as system service
   - Configure auto-start on boot
   - Set up monitoring/logging
   - Document K40 IP and settings

4. **Optional: Multiple devices**
   - Register additional K40 devices
   - Each needs unique IP
   - Bridge handles all simultaneously

## Support

Your K40 is now ready to use with real ZKTeco protocol support!

If you encounter issues:
1. Check bridge console output first
2. Review K40_SETUP_GUIDE.md troubleshooting section
3. Verify network connectivity (ping, telnet)
4. Check browser console for frontend errors

**Pro tip:** Keep the bridge terminal visible while testing so you can see real-time logs.

Good luck connecting your K40!
