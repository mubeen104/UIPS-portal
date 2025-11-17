# Device Integration Troubleshooting Checklist

Use this checklist to diagnose and fix device connection issues systematically.

## Quick Diagnostic Flow

```
Device Not Working?
    ↓
Is Bridge Running? → NO → Start bridge service
    ↓ YES
Can Ping Device? → NO → Check network/IP
    ↓ YES
Can Telnet Port? → NO → Check port/firewall
    ↓ YES
Test Script Works? → NO → Check device protocol
    ↓ YES
UI Test Works? → NO → Check bridge logs
    ↓ YES
✓ Device Ready!
```

## Pre-Setup Checklist

Before attempting device integration, verify:

- [ ] Fingerprint device is powered on
- [ ] Device is connected to network (Ethernet cable plugged in)
- [ ] Device has IP address configured (check device menu)
- [ ] Computer/server is on same network as device
- [ ] Node.js 18+ is installed (`node --version`)
- [ ] npm is installed (`npm --version`)
- [ ] You have Supabase Service Role Key

## Bridge Service Checklist

### Installation Issues

**Problem:** `npm install` fails

- [ ] Node.js version is 18 or higher?
- [ ] Internet connection working?
- [ ] In correct directory? (`cd biometric-bridge`)
- [ ] Try clearing cache: `npm cache clean --force` then reinstall

**Problem:** Bridge won't start

- [ ] `.env` file exists in biometric-bridge directory?
- [ ] SUPABASE_URL is set in .env?
- [ ] SUPABASE_SERVICE_ROLE_KEY is set in .env?
- [ ] Service Role Key starts with "eyJ"?
- [ ] Port 3001 is not already in use?
  ```bash
  lsof -i :3001
  # If in use, kill the process or change BRIDGE_PORT in .env
  ```

**Problem:** "Missing environment variables" error

- [ ] Copied .env.example to .env?
- [ ] Edited .env with actual values?
- [ ] No spaces around `=` in .env? (should be `KEY=value` not `KEY = value`)
- [ ] No quotes around values? (should be `KEY=value` not `KEY="value"`)
- [ ] Saved the .env file after editing?

### Bridge Health Check

Run these commands to verify bridge is working:

```bash
# 1. Check bridge is running
curl http://localhost:3001/health

# Expected response:
# {"status":"healthy","version":"2.0.0",...}

# 2. If curl fails, check if service is listening
lsof -i :3001

# 3. Check bridge logs for errors
# (See terminal where bridge is running)
```

- [ ] Health endpoint returns JSON?
- [ ] Port 3001 shows in `lsof` output?
- [ ] No error messages in bridge logs?
- [ ] Bridge terminal shows "BRIDGE SERVICE READY"?

## Network Connectivity Checklist

### Basic Network Tests

Test from the computer running the bridge service:

```bash
# 1. Ping device
ping 192.168.1.201

# 2. Test TCP port
telnet 192.168.1.201 4370
# or
nc -zv 192.168.1.201 4370

# 3. Check routing
traceroute 192.168.1.201
```

**Replace `192.168.1.201` with your device's actual IP**

- [ ] Ping succeeds? (shows replies, not timeouts)
- [ ] Telnet/nc connects? (shows "Connected" message)
- [ ] Traceroute shows direct path? (1-2 hops max)

### Network Issues

**Ping fails:**

- [ ] Device IP address is correct?
  - Check on device: Menu → Communication → Network
- [ ] Device is powered on?
- [ ] Network cable is connected?
- [ ] Device and computer on same network/subnet?
  - Device: 192.168.1.x
  - Computer: 192.168.1.y
  - Should match first 3 octets
- [ ] Check network switch/router

**Ping works but telnet fails:**

- [ ] Port number is correct? (usually 4370 for ZKTeco)
  - Check on device: Menu → Communication → Network → Port
- [ ] Firewall blocking port?
  - On device
  - On computer
  - On network router
- [ ] Device service is running? (try restarting device)

### Firewall Checklist

**On Linux (UFW):**
```bash
sudo ufw allow 3001/tcp  # Bridge service
sudo ufw status
```

**On Linux (iptables):**
```bash
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables-save
```

**On Windows:**
```powershell
netsh advfirewall firewall add rule name="Biometric Bridge" dir=in action=allow protocol=TCP localport=3001
```

**On macOS:**
```bash
# Firewall usually doesn't block localhost
# If blocking, go to System Preferences > Security & Privacy > Firewall
```

- [ ] Firewall allows bridge port (3001)?
- [ ] Firewall allows device port (4370)?
- [ ] No network firewall blocking connections?

## Device Configuration Checklist

### Device Network Settings

On ZKTeco K40 device:

1. Press **MENU**
2. Navigate to **Communication** → **Network Settings**
3. Verify:

- [ ] IP Address is correct and noted
- [ ] Port is correct (default 4370)
- [ ] Subnet mask matches network (usually 255.255.255.0)
- [ ] Gateway is correct (usually router IP)
- [ ] Connection mode is TCP/IP (not Serial/USB)

### Device Settings

- [ ] Device has static IP? (not DHCP, or DHCP with reservation)
- [ ] Device is in correct mode? (not in lock-down or setup mode)
- [ ] Device has available memory? (not full)
- [ ] Device firmware is up to date?
- [ ] Device admin password is known? (if required)

## Test Script Checklist

### Running test-connection.js

```bash
cd biometric-bridge
node test-connection.js 192.168.1.201 4370
```

**Success indicators:**

- [ ] "Socket connected successfully"
- [ ] Device info retrieved (Model, Serial, Firmware)
- [ ] User count shown
- [ ] Attendance record count shown
- [ ] "Test Result: SUCCESS"

**Failure analysis:**

**Error:** "Connection timeout"
- [ ] Device powered on?
- [ ] Correct IP address?
- [ ] Network connectivity (ping test)?
- [ ] Device on different network?

**Error:** "ECONNREFUSED"
- [ ] Device online?
- [ ] Correct port (try 4370)?
- [ ] Device service running? (restart device)

**Error:** "EHOSTUNREACH"
- [ ] Network routing issue?
- [ ] Different subnet?
- [ ] Check gateway settings

## Web UI Integration Checklist

### Device Registration

- [ ] Bridge service is running?
- [ ] Device tested with test-connection.js?
- [ ] Correct protocol selected? (ZKTeco, Anviz, etc.)
- [ ] Correct IP address entered?
- [ ] Correct port entered?
- [ ] Device name is descriptive?
- [ ] Location is filled in?

### Connection Test from UI

Click "Test" button on device card:

**Expected behavior:**

- [ ] Bridge console shows connection attempt
- [ ] Device status changes to "Online"
- [ ] Green indicator appears
- [ ] Success message shows user count and record count
- [ ] Last heartbeat timestamp updates

**Troubleshooting test failures:**

**"Connection timeout":**
- [ ] Bridge service running? (check http://localhost:3001/health)
- [ ] Device reachable from bridge? (run test-connection.js)
- [ ] Correct IP in device registration?

**"Connection refused":**
- [ ] Correct port number?
- [ ] Device service running?
- [ ] Restart device and try again?

**"Device not found":**
- [ ] Device registered in database?
- [ ] Using correct device ID in test?
- [ ] Check browser console for errors?

## Enrollment Checklist

### Before Enrollment

- [ ] Device shows "Online" status in UI?
- [ ] Test connection succeeds?
- [ ] Employee exists in system?
- [ ] Employee ID is set correctly?
- [ ] Bridge service running?

### During Enrollment

Steps:
1. Select employee
2. Select device (must be online)
3. Click "Test" to verify connection
4. Select finger position
5. Click "Start Enrollment"

**Physical actions required:**

- [ ] Place finger on device scanner when prompted?
- [ ] Keep finger steady during scan?
- [ ] Scan finger 3 times (K40 standard)?
- [ ] Wait for device beeps/voice prompts?

**Progress indicators:**

- [ ] Web UI shows "Connecting to device..."
- [ ] Web UI shows "Waiting for fingerprint..."
- [ ] Web UI shows "Processing template..."
- [ ] Web UI shows "Complete!" with success message
- [ ] Bridge console logs enrollment activity

### Enrollment Failures

**"Device not responding":**
- [ ] Device online? (test connection)
- [ ] Bridge service running?
- [ ] Check bridge console for errors

**"No template data received":**
- [ ] Actually placed finger on scanner?
- [ ] Device in enrollment mode?
- [ ] Device memory not full?
- [ ] Device functioning correctly?

**"Enrollment timeout":**
- [ ] Finger placed quickly enough?
- [ ] Device responding? (check device display)
- [ ] Try different finger?
- [ ] Restart device?

## Attendance Sync Checklist

### Manual Sync

Click "Sync" button on device:

- [ ] Device is online?
- [ ] Bridge service running?
- [ ] Device has attendance records? (check on device)
- [ ] Employees enrolled? (UIDs must match)

**After sync:**

- [ ] Bridge console shows sync activity?
- [ ] "Synced X records" message appears?
- [ ] Attendance records appear in Attendance tab?
- [ ] Last sync timestamp updates on device card?

### Auto-Sync

If auto-sync not working:

- [ ] Auto-sync enabled in device settings?
- [ ] Sync interval configured? (default 300 seconds)
- [ ] Bridge service running continuously?
- [ ] Check bridge logs for auto-sync messages

### No Records After Sync

**Problem:** Sync completes but no records in database

- [ ] Check bridge console for "no employee match" messages
- [ ] Employee IDs contain numbers?
- [ ] Device UIDs match employee ID numbers?
- [ ] Example: Employee ID "EMP-001234" → Device UID "001234"

**Verify mapping:**

1. Check employee IDs in database
2. Check device UIDs on device or in bridge logs
3. Ensure numbers match

```sql
-- Check employee IDs
SELECT id, employee_id FROM employees;

-- Check attendance logs with employee info
SELECT a.*, e.employee_id
FROM attendance_logs a
JOIN employees e ON a.employee_id = e.id
ORDER BY a.log_time DESC
LIMIT 10;
```

## Database Checklist

### Verify Tables Exist

```sql
-- Check device protocols
SELECT * FROM device_protocols;

-- Check registered devices
SELECT * FROM biometric_devices;

-- Check employees
SELECT id, employee_id, first_name, last_name FROM employees;

-- Check biometric templates
SELECT * FROM biometric_templates;

-- Check attendance logs
SELECT * FROM attendance_logs ORDER BY log_time DESC LIMIT 10;
```

- [ ] device_protocols table has data?
- [ ] biometric_devices table has your device?
- [ ] employees table has employees?
- [ ] Device ID in biometric_devices matches registration?

## Common Error Messages

### "Missing environment variables"

**Cause:** .env file not configured

**Fix:**
1. `cd biometric-bridge`
2. `cp .env.example .env`
3. Edit .env and add Supabase credentials
4. Restart bridge

### "Port 3001 already in use"

**Cause:** Another process using port 3001

**Fix Option 1 - Kill process:**
```bash
lsof -i :3001
kill -9 <PID>
```

**Fix Option 2 - Change port:**
1. Edit .env: `BRIDGE_PORT=3002`
2. Restart bridge

### "Connection timeout"

**Cause:** Cannot reach device

**Fix:**
1. Verify device IP: check device menu
2. Test network: `ping <device-ip>`
3. Check device powered on
4. Ensure same network

### "Connection refused"

**Cause:** Wrong port or device offline

**Fix:**
1. Verify port: check device menu (usually 4370)
2. Test port: `telnet <device-ip> <port>`
3. Restart device
4. Check firewall

### "Device not found"

**Cause:** Device not in database

**Fix:**
1. Register device in web UI
2. Verify device saved (refresh page)
3. Check database: `SELECT * FROM biometric_devices`

### "No template data received"

**Cause:** Finger not scanned or enrollment failed

**Fix:**
1. Ensure finger placed on scanner
2. Wait for device prompts (beeps/voice)
3. Keep finger steady during scan
4. Try different finger
5. Check device memory not full

## Step-by-Step Troubleshooting

### If Nothing Works

Start from scratch:

**1. Verify Prerequisites:**
```bash
# Check Node version
node --version  # Should be 18+

# Check npm
npm --version

# Check network
ping 192.168.1.201  # Your device IP
```

**2. Clean Install:**
```bash
cd biometric-bridge
rm -rf node_modules package-lock.json
npm install
```

**3. Verify Configuration:**
```bash
# Check .env exists
ls -la .env

# View contents (be careful not to share Service Role Key!)
cat .env

# Verify values
grep SUPABASE_URL .env
grep BRIDGE_PORT .env
```

**4. Test Device Connection:**
```bash
# Direct test
node test-connection.js <device-ip> 4370

# If fails, test network
ping <device-ip>
telnet <device-ip> 4370
```

**5. Start Bridge with Logging:**
```bash
# Start bridge
npm start

# In new terminal, test health
curl http://localhost:3001/health
```

**6. Test from Web UI:**
- Open application
- Go to Biometric → Devices
- Register device if not exists
- Click "Test" button
- Check bridge console logs

**7. If Still Fails:**
- Check browser console (F12)
- Check bridge console logs
- Verify all checklist items above
- Document specific error messages

## Support Resources

### Log Locations

- **Bridge Console:** Terminal where `npm start` is running
- **Browser Console:** Press F12 → Console tab
- **Device Logs:** On device display (if available)

### Diagnostic Commands

```bash
# Network diagnostics
ping <device-ip>
telnet <device-ip> <port>
nc -zv <device-ip> <port>
traceroute <device-ip>

# Port diagnostics
lsof -i :<port>
netstat -an | grep <port>

# Process diagnostics
ps aux | grep node
ps aux | grep bridge

# Bridge health
curl http://localhost:3001/health

# Test device
cd biometric-bridge
node test-connection.js <device-ip> <port>
```

### Configuration Files

- `biometric-bridge/.env` - Bridge configuration
- `biometric-bridge/.env.example` - Template
- `biometric-bridge/package.json` - Dependencies
- `DEVICE_SETUP_GUIDE.md` - Full setup instructions

## Quick Reference

### Default Values

| Setting | Value |
|---------|-------|
| Bridge Port | 3001 |
| ZKTeco Port | 4370 |
| Anviz Port | 5010 |
| eSSL Port | 4370 |
| Node.js Version | 18+ |

### Required Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BRIDGE_PORT=3001
NODE_ENV=development
```

### Service Commands

```bash
# Start bridge
npm start

# Test connection
node test-connection.js <ip> <port>

# Check health
curl http://localhost:3001/health

# View logs (if using PM2)
pm2 logs biometric-bridge

# Restart (if using PM2)
pm2 restart biometric-bridge
```

---

**Remember:** Work through the checklist systematically. Most issues are related to network connectivity, configuration, or the bridge service not running.
