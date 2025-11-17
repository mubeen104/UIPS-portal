# Device Integration - Simple Setup Guide

This guide provides clear, step-by-step instructions to connect your fingerprint devices with the HR application.

## Quick Overview

Your system has 3 components that work together:

```
Web Application → Supabase Cloud → Bridge Service → Fingerprint Device
  (Browser)      (Edge Functions)   (Your Network)   (ZKTeco K40, etc.)
```

**Important:** The bridge service is required for real device communication. Without it, the system runs in simulated mode (testing only).

## Prerequisites

Before starting, ensure you have:

- ✅ Fingerprint device powered on and connected to network
- ✅ Device IP address (check device menu: Communication → Network Settings)
- ✅ Computer on same network as the device
- ✅ Node.js 18+ installed on bridge computer
- ✅ Supabase Service Role Key (see Step 1 below)

## Step 1: Get Your Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/bdzaubmitwvhgwfhkzwo/settings/api
2. Scroll to **"Service Role Key"** section
3. Click to reveal the key (starts with `eyJ...`)
4. Copy the entire key
5. Keep it secure - this key has full database access

## Step 2: Configure the Bridge Service

Open a terminal and navigate to the bridge directory:

```bash
cd /path/to/your/project/biometric-bridge
```

### 2.1 Install Dependencies

```bash
npm install
```

This installs:
- `node-zklib` - ZKTeco protocol support
- `express` - Web server framework
- `@supabase/supabase-js` - Database connection
- Other required packages

### 2.2 Configure Environment

If `.env` file doesn't exist, create it from the example:

```bash
cp .env.example .env
```

Edit the `.env` file:

```bash
nano .env
# or use your preferred editor: code .env, vim .env, etc.
```

Replace `SUPABASE_SERVICE_ROLE_KEY` with the key from Step 1:

```env
SUPABASE_URL=https://bdzaubmitwvhgwfhkzwo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (paste your actual key here)
BRIDGE_PORT=3001
NODE_ENV=development
```

Save the file.

## Step 3: Find Your Device IP Address

On your ZKTeco K40 device:

1. Press **MENU** button
2. Navigate to **Communication** → **Network Settings**
3. Note down:
   - **IP Address**: (e.g., 192.168.1.201)
   - **Port**: (usually 4370)
   - **MAC Address**: (optional)

**Important:** Device should have a static IP. If using DHCP, reserve the IP in your router.

## Step 4: Test Device Connection (Before Starting Bridge)

Test if your device is reachable:

```bash
# Test network connectivity
ping 192.168.1.201

# If ping works, test the port
telnet 192.168.1.201 4370
# Press Ctrl+C to exit if connection succeeds
```

If ping fails:
- ❌ Device is off or wrong IP address
- ❌ Device on different network/VLAN
- ❌ Network cable unplugged

If ping works but telnet fails:
- ❌ Wrong port number
- ❌ Firewall blocking connection

## Step 5: Test with Bridge Test Script

The bridge includes a connection test script:

```bash
cd biometric-bridge
node test-connection.js 192.168.1.201 4370
```

**Replace `192.168.1.201` with your device's actual IP address.**

### Expected Success Output:

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

### If Test Fails:

Check the error message and follow the suggested troubleshooting steps printed by the script.

## Step 6: Start the Bridge Service

```bash
npm start
```

### Expected Output:

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

**Keep this terminal window open!** The bridge must stay running.

### Verify Bridge is Running:

Open a new terminal and test:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "zklib": "enabled",
  "uptime": 12.34,
  "timestamp": "2025-11-17T12:00:00.000Z",
  "activeConnections": 0
}
```

## Step 7: Register Device in Web Application

1. Open the HR application in your browser
2. Navigate to **Biometric** → **Devices** tab
3. Click **"Add Device"** button

### Fill in Device Information:

| Field | Value | Example |
|-------|-------|---------|
| Device Name | Descriptive name | `K40 Main Entrance` |
| Device ID | Unique identifier | `K40-001` |
| Protocol | Select from dropdown | `ZKTeco` |
| Location | Physical location | `Building A - Main Entrance` |
| IP Address | From Step 3 | `192.168.1.201` |
| Port | From Step 3 | `4370` |
| MAC Address | Optional | `00:17:61:12:34:56` |
| Serial Number | Optional | `ABC123456` |
| Auto-Sync | Check this | ✓ Enabled |
| Sync Interval | Seconds | `300` (5 minutes) |
| Real-time Push | Check this | ✓ Enabled |

4. Click **"Register Device"**

## Step 8: Test Connection from Web UI

1. Find your device in the device list
2. Click the **"Test"** button on the device card
3. Watch the bridge terminal for connection logs
4. Check the web UI for results

### Success Indicators:

- ✅ Green status indicator on device card
- ✅ "Online" status
- ✅ Message: "ZKTeco K40 connected successfully. Found X users and Y attendance records."
- ✅ Bridge console shows successful connection logs

### Failure Indicators:

- ❌ Red/gray status indicator
- ❌ "Offline" status
- ❌ Error message with diagnostic information
- ❌ Bridge console shows connection errors

## Step 9: Enroll Your First Fingerprint

1. Navigate to **Biometric** → **Enrollment** tab
2. Select an employee from the dropdown
3. Select your device (must show as "Online")
4. Click **"Test"** to verify connection
5. Select finger position (e.g., "Right Index Finger")
6. Click **"Start Enrollment"**

### During Enrollment:

1. **Web UI** shows progress: "Connecting to device..." → "Waiting for fingerprint..."
2. **Physical Action Required:** Place finger on the K40 scanner
3. **K40 Device** will beep/speak: "Please place finger" (3 times)
4. Keep finger steady during each scan
5. **Web UI** shows: "Processing template..." → "Complete!"

### Success:

- ✅ Web UI shows success message
- ✅ Fingerprint template saved to database
- ✅ Bridge console logs successful enrollment
- ✅ K40 device stores the fingerprint

## Step 10: Sync Attendance Records

1. Go back to **Biometric** → **Devices** tab
2. Click **"Sync"** button on your device
3. Wait for sync to complete

### What Happens:

1. Bridge connects to K40 device
2. Fetches all attendance records
3. Filters out records already in database
4. Maps device UIDs to employee IDs
5. Inserts new records into database

### View Records:

Navigate to **Attendance** tab to see synced attendance data.

## Troubleshooting

### Bridge Won't Start

**Error:** `Port 3001 already in use`

```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env
BRIDGE_PORT=3002
```

**Error:** `Missing environment variables`

- Verify `.env` file exists in biometric-bridge directory
- Check that SUPABASE_SERVICE_ROLE_KEY is set
- Ensure no spaces around `=` in .env file

**Error:** `Cannot find module 'node-zklib'`

```bash
# Reinstall dependencies
npm install
```

### Device Shows Offline

**Check List:**

1. ✓ Is device powered on?
2. ✓ Can you ping the device IP?
3. ✓ Is bridge service running?
4. ✓ Is IP address correct?
5. ✓ Is port number correct?
6. ✓ Are device and bridge on same network?

**Network Test:**

```bash
# From bridge computer
ping 192.168.1.201
telnet 192.168.1.201 4370
```

### Enrollment Fails

**Common Issues:**

1. **"Device not responding"**
   - Test connection first (click "Test" button)
   - Ensure bridge is running
   - Check bridge console for errors

2. **"No template data received"**
   - Place finger on scanner when prompted
   - Wait for device beeps/voice prompts
   - Try different finger if one fails

3. **"Enrollment timeout"**
   - Device may be in wrong mode
   - Restart device and try again
   - Check device memory isn't full

### No Attendance Records After Sync

**Issue:** Sync completes but no records appear

**Cause:** Employee ID mapping problem

**Solution:**

The bridge maps device UIDs to employee IDs by extracting numbers from employee_id field.

Example:
- Employee ID: `EMP-001234` → Device UID: `001234`
- Employee ID: `STAFF-0789` → Device UID: `789`

Check bridge console logs during sync for mapping messages:
```
Skipping record - no employee match for device UID 001234
```

Ensure employee IDs contain numbers that match device UIDs.

## Running Bridge as a Service (Production)

For production use, run the bridge as a background service so it starts automatically.

### Linux (systemd):

Create `/etc/systemd/system/biometric-bridge.service`:

```ini
[Unit]
Description=Biometric Device Bridge Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/biometric-bridge
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable biometric-bridge
sudo systemctl start biometric-bridge
sudo systemctl status biometric-bridge
```

### Using PM2 (Cross-platform):

```bash
# Install PM2 globally
npm install -g pm2

# Start bridge
cd biometric-bridge
pm2 start index.js --name biometric-bridge

# Save configuration
pm2 save

# Setup auto-start
pm2 startup
# Follow the instructions shown
```

## Network Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   User's Browser                        │
│              (React Web Application)                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Cloud                         │
│            (Edge Functions + Database)                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Local Network)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Bridge Service (Your Network)              │
│         Node.js + Express + node-zklib                  │
│              Port: 3001 (Configurable)                  │
└────────────────────────┬────────────────────────────────┘
                         │ TCP Protocol (Port 4370)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              ZKTeco K40 Device                          │
│           IP: 192.168.1.201 (Example)                   │
│              Fingerprint Scanner                        │
└─────────────────────────────────────────────────────────┘
```

## Important Notes

### About the Bridge Service:

1. **Must be on same network as devices** - Cannot communicate across different networks without VPN/port forwarding
2. **Must stay running** - If bridge stops, device operations will fail
3. **One bridge serves all devices** - Register multiple devices, bridge handles them all
4. **Security** - Keep bridge on private network, don't expose to internet

### About Employee IDs:

Device UIDs must match employee ID numbers. When enrolling:
- Bridge extracts numbers from employee_id
- Uses last 6 digits as device UID
- During sync, maps UID back to employee

### About Auto-Sync:

Once configured, bridge automatically syncs attendance every 5 minutes (configurable):
- Fetches new records from device
- Filters duplicates
- Inserts to database
- No manual action needed

## Quick Reference

### Bridge Commands:

```bash
cd biometric-bridge

# Start bridge
npm start

# Test device connection
node test-connection.js <IP> <PORT>

# Check bridge health
curl http://localhost:3001/health
```

### Device Default Ports:

| Brand | Default Port | Protocol |
|-------|-------------|----------|
| ZKTeco | 4370 | TCP |
| Anviz | 5010 | TCP |
| eSSL | 4370 | TCP |
| Suprema | 1470 | TCP |

### Common Network Commands:

```bash
# Test connectivity
ping 192.168.1.201

# Test port
telnet 192.168.1.201 4370
nc -zv 192.168.1.201 4370

# Find what's using a port
lsof -i :3001

# Check bridge logs (if using PM2)
pm2 logs biometric-bridge
```

## Next Steps After Setup

1. ✅ Enroll all employees' fingerprints
2. ✅ Test attendance by having employees scan
3. ✅ Verify auto-sync is working
4. ✅ Set up bridge as a service for production
5. ✅ Configure multiple devices if needed
6. ✅ Set up monitoring/alerts for bridge health

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Bridge Logs** - Console output shows detailed error messages
2. **Check Browser Console** - Press F12 in browser, check Console tab
3. **Review Device Documentation** - Check device manual for specific settings
4. **Test Network** - Use ping, telnet to verify connectivity
5. **Verify Configuration** - Double-check IP addresses, ports, credentials

## Summary Checklist

- [ ] Service Role Key obtained from Supabase
- [ ] Bridge dependencies installed (`npm install`)
- [ ] `.env` file configured with credentials
- [ ] Device IP address identified
- [ ] Network connectivity verified (ping + telnet)
- [ ] Test script successful (`test-connection.js`)
- [ ] Bridge service running (`npm start`)
- [ ] Bridge health check passes (`curl /health`)
- [ ] Device registered in web UI
- [ ] Connection test from web UI successful
- [ ] First fingerprint enrolled successfully
- [ ] Attendance sync working
- [ ] Bridge configured as service (production)

---

**You're Done!** Your fingerprint device is now integrated with the HR application.
