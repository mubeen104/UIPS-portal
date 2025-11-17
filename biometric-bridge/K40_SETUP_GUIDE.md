# ZKTeco K40 Connection Guide

Your bridge service is now configured with real ZKTeco protocol support using node-zklib.

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the `biometric-bridge` directory:

```bash
cd biometric-bridge
cp .env.example .env
```

Edit the `.env` file and add your Supabase Service Role Key:

```env
SUPABASE_URL=https://bdzaubmitwvhgwfhkzwo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
BRIDGE_PORT=3001
NODE_ENV=development
```

**Get your Service Role Key:**
1. Go to https://supabase.com/dashboard/project/bdzaubmitwvhgwfhkzwo/settings/api
2. Find "Service Role Key" under "Project API keys"
3. Copy and paste it into the `.env` file

### 2. Start the Bridge Service

```bash
cd biometric-bridge
npm start
```

You should see:
```
✓ Biometric Bridge Service running on port 3001
✓ ZKTeco SDK: node-zklib enabled
✓ Health check: http://localhost:3001/health
```

### 3. Find Your K40 Device IP Address

On your K40 device:
1. Press MENU button
2. Navigate to: **Communication** → **Network Settings** → **IP Address**
3. Note down the IP address (e.g., 192.168.1.201)

The default port is **4370** (you don't need to change this).

### 4. Register Your K40 in the Web Application

1. Open your HR application
2. Go to **Biometric** → **Devices** tab
3. Click **"Add Device"**
4. Fill in:
   - **Device Name**: "K40 Main Entrance" (or any name you like)
   - **Device ID**: "K40-001" (or any unique ID)
   - **Protocol**: Select "ZKTeco"
   - **Location**: "Main Entrance"
   - **IP Address**: Your K40's IP (e.g., 192.168.1.201)
   - **Port**: 4370
   - **Auto-Sync**: Enable (recommended)
   - **Sync Interval**: 300 seconds (5 minutes)
5. Click **"Register Device"**

### 5. Test Connection to K40

1. Find your newly registered K40 device in the list
2. Click the **"Test"** button
3. Check the bridge console output for detailed logs

**Expected Success:**
```
Testing connection to ZKTeco device at 192.168.1.201:4370
Attempting ZKTeco connection to 192.168.1.201:4370...
Getting device info...
Device info retrieved: { model: 'K40', serialNumber: '...', firmware: '...' }
```

The web UI will show:
- Green checkmark
- "ZKTeco K40 connected successfully. Found X users and Y attendance records."
- Device will show as online

**If Connection Fails:**

Check these common issues:

1. **Wrong IP Address**
   - Verify K40's IP on device menu
   - Try pinging: `ping 192.168.1.201`

2. **Network Issue**
   - Ensure bridge service computer is on same network as K40
   - Check firewall isn't blocking port 4370
   - Test with: `telnet 192.168.1.201 4370`

3. **Device Offline**
   - Make sure K40 is powered on
   - Check network cable is connected
   - Restart K40 if needed

4. **Port Blocked**
   - Default is 4370
   - Check K40 menu: Communication → Network Settings → Port
   - Ensure firewall allows port 4370

## Using Your K40

### Enrolling Fingerprints

1. Go to **Biometric** → **Enrollment** tab
2. Select an employee from the list
3. Select your K40 device (must be online)
4. Click **"Test"** to verify connection first
5. Select finger position (e.g., Right Index)
6. Click **"Start Enrollment"**
7. **Place finger on K40 scanner when prompted**
8. Follow K40 voice/beep prompts (usually 3 scans)
9. Wait for "Enrollment successful" message

**Important:** The employee must physically place their finger on the K40 scanner when enrollment starts. The bridge service will communicate with K40 to enter enrollment mode.

### Syncing Attendance Records

**Manual Sync:**
1. Go to **Biometric** → **Devices**
2. Click **"Sync"** button on your K40 device card
3. Wait for sync to complete
4. View synced records in **Attendance** tab

**Automatic Sync:**
- Enabled by default every 5 minutes
- K40 automatically sends new attendance records
- View real-time attendance in dashboard

**How Sync Works:**
1. Bridge connects to K40
2. Retrieves all attendance records from K40 memory
3. Filters out duplicates already in database
4. Matches device UIDs to employees in your system
5. Inserts new records into attendance database

### Employee ID Mapping

The K40 uses numeric User IDs (UIDs). The bridge maps these to your employees:

- Extracts numeric digits from employee ID
- Uses last 6 digits as UID on K40
- Example: Employee "EMP-001234" → UID 001234 on K40

**Tip:** When enrolling, note the UID assigned in the bridge console logs.

## Troubleshooting

### Bridge Service Won't Start

```bash
# Check port 3001 is available
lsof -i :3001

# If port is in use, kill the process or change port in .env
kill -9 <PID>
```

### Connection Timeout

**Check network connectivity:**
```bash
# Ping K40
ping 192.168.1.201

# Test TCP port
telnet 192.168.1.201 4370
# or
nc -zv 192.168.1.201 4370
```

**Common causes:**
- K40 on different subnet
- Firewall blocking connection
- K40 powered off or network cable unplugged
- Wrong IP address

### Enrollment Fails

**Check:**
1. Bridge service is running (`npm start` in biometric-bridge/)
2. K40 device shows as online in web UI
3. Employee is selected correctly
4. Finger is placed on K40 scanner when prompted
5. K40 has available memory

**Bridge logs will show:**
```
Starting ZKTeco enrollment for employee abc123...
Setting device to enrollment mode for user 123, finger 6...
```

Watch for error messages and check K40 display.

### No Attendance Records Syncing

**Check:**
1. Auto-sync is enabled on device settings
2. Bridge service is running
3. Employees are enrolled on K40
4. Employee IDs in system match UIDs on K40
5. Bridge logs show employee mapping

**Manual sync test:**
```bash
# In bridge console, you'll see:
Syncing attendance logs from ZKTeco device...
Found X attendance records on device
Filtered to Y new attendance records
Successfully pushed Y logs to database
```

### Device Shows Offline After Being Online

**Causes:**
- Bridge service stopped or crashed
- K40 lost network connection
- K40 powered off

**Fix:**
1. Check bridge service is running
2. Test connection again from web UI
3. Restart bridge service if needed
4. Check K40 network connection

## K40 Device Settings

### Recommended Settings

1. **Network:**
   - Static IP (don't use DHCP)
   - Same subnet as bridge service
   - Port: 4370

2. **Communication:**
   - Protocol: TCP/IP
   - Timeout: 30 seconds

3. **System:**
   - Time sync: Enable (or set manually)
   - Timezone: Match your location

### Accessing K40 Menu

1. Press **MENU** button
2. Enter admin password (default: 0)
3. Navigate with arrow keys
4. Press OK to select

## Advanced Configuration

### Custom Port

If K40 uses different port:
1. Check K40 menu: Communication → Port
2. Update device registration in web UI with correct port

### Multiple K40 Devices

You can connect multiple K40 devices:
1. Each device needs unique IP address
2. Register each device separately in web UI
3. Bridge handles all devices through single service

### Auto-Start Bridge Service

**Linux (systemd):**
```bash
sudo nano /etc/systemd/system/biometric-bridge.service
```

```ini
[Unit]
Description=Biometric Bridge Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/biometric-bridge
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable biometric-bridge
sudo systemctl start biometric-bridge
```

**Windows:**
Use `pm2` or `nssm` to run as service

**Using PM2:**
```bash
npm install -g pm2
pm2 start index.js --name biometric-bridge
pm2 save
pm2 startup
```

## Testing Checklist

- [ ] Bridge service starts without errors
- [ ] Health check returns status: healthy
- [ ] Can ping K40 IP address
- [ ] Test connection succeeds from web UI
- [ ] K40 shows as online (green indicator)
- [ ] Can enroll test fingerprint
- [ ] Enrollment appears in biometric templates table
- [ ] Can sync attendance records
- [ ] Synced records appear in attendance table
- [ ] Auto-sync runs every 5 minutes

## Support

### Bridge Console Logs

The bridge console shows detailed information:
- Connection attempts
- Device info retrieved
- Enrollment progress
- Sync operations
- Errors and troubleshooting info

Always check console when troubleshooting.

### Browser Console

Press F12 in browser to see frontend errors and API calls.

### Common Issues Reference

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection timeout | Network/IP wrong | Verify IP, check network |
| ECONNREFUSED | K40 offline/wrong port | Check K40 power, verify port 4370 |
| Enrollment fails | Not placing finger | Place finger on scanner when prompted |
| No records sync | Employee ID mismatch | Check UID mapping in logs |
| Bridge won't start | Port in use | Change port or kill process |

## Next Steps

1. ✅ Configure .env with Service Role Key
2. ✅ Start bridge service
3. ✅ Register K40 device
4. ✅ Test connection
5. ✅ Enroll test fingerprint
6. ✅ Verify attendance sync works
7. 🔄 Enable auto-sync (already enabled by default)
8. 🔄 Set up bridge auto-start for production

## Quick Reference

**Bridge Commands:**
```bash
cd biometric-bridge
npm start              # Start service
npm install           # Install dependencies
node index.js         # Alternative start
```

**K40 Default Settings:**
- Port: 4370
- Protocol: TCP/IP
- Timeout: 10 seconds

**URLs:**
- Bridge health: http://localhost:3001/health
- Supabase: https://bdzaubmitwvhgwfhkzwo.supabase.co

You're all set! Your K40 should now work with real ZKTeco protocol support.
