# Quick Start: Device Integration in 5 Minutes

This is the fastest way to get your fingerprint device connected. Follow these steps in order.

## Overview

You need 3 things working together:
1. **Web Application** (already running)
2. **Bridge Service** (you'll set up now)
3. **Fingerprint Device** (your ZKTeco K40 or similar)

## Step 1: Get Service Role Key (2 minutes)

1. Visit: https://supabase.com/dashboard/project/bdzaubmitwvhgwfhkzwo/settings/api
2. Find **"Service Role Key"** section
3. Click to reveal and copy the key (starts with `eyJ...`)

## Step 2: Configure Bridge (1 minute)

```bash
cd biometric-bridge

# Copy environment template
cp .env.example .env

# Edit and paste your Service Role Key
nano .env
# or: code .env, vim .env, etc.
```

Your `.env` should look like:
```env
SUPABASE_URL=https://bdzaubmitwvhgwfhkzwo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your actual key)
BRIDGE_PORT=3001
NODE_ENV=development
```

## Step 3: Install & Start Bridge (2 minutes)

```bash
# Install dependencies (first time only)
npm install

# Start the bridge
npm start
```

You should see:
```
============================================================
✓ BRIDGE SERVICE READY
============================================================
```

**Keep this terminal open!**

## Step 4: Find Device IP (1 minute)

On your device:
1. Press **MENU**
2. Go to **Communication** → **Network Settings**
3. Note the **IP Address** (e.g., 192.168.1.201)

## Step 5: Test Connection (30 seconds)

In a **new terminal**:

```bash
cd biometric-bridge
node test-connection.js 192.168.1.201 4370
```

Replace `192.168.1.201` with your device IP.

**If it succeeds:** ✓ You're ready to go!

**If it fails:** See troubleshooting below.

## Step 6: Register in Web UI (1 minute)

1. Open HR application
2. Go to **Biometric** → **Devices**
3. Click **Add Device**
4. Fill in:
   - Name: `K40 Main Entrance`
   - Device ID: `K40-001`
   - Protocol: `ZKTeco`
   - IP: Your device IP
   - Port: `4370`
5. Click **Register Device**
6. Click **Test** button
7. Should show "Online" ✓

## Step 7: Enroll Fingerprint (2 minutes)

1. Go to **Biometric** → **Enrollment**
2. Select employee
3. Select your device (must be online)
4. Select finger position
5. Click **Start Enrollment**
6. **Place finger on scanner** when prompted
7. Wait for 3 scans (device will beep)
8. Done! ✓

## That's It!

Your device is now connected. Employees can:
- Scan fingerprints on the device
- Attendance auto-syncs every 5 minutes
- View records in the Attendance tab

## Troubleshooting

### Bridge won't start?

**"Missing environment variables"**
- Did you create `.env` file?
- Did you paste the Service Role Key?
- Save the file?

**"Port already in use"**
```bash
# Change port in .env
BRIDGE_PORT=3002
```

### Test connection fails?

**Can't ping device:**
```bash
ping 192.168.1.201
```
- Device powered on?
- Connected to network?
- Correct IP?

**Ping works, test fails:**
- Wrong port? (check device menu)
- Try restarting device

### Device shows offline in UI?

- Bridge running? (check terminal)
- Test connection script works?
- Correct IP in device registration?
- Click "Test" button again

### Need more help?

See detailed guides:
- **DEVICE_SETUP_GUIDE.md** - Complete setup instructions
- **TROUBLESHOOTING_CHECKLIST.md** - Systematic troubleshooting
- **biometric-bridge/README.md** - Bridge service documentation

## Running Bridge as Background Service

For production (keeps running after closing terminal):

```bash
# Install PM2
npm install -g pm2

# Start bridge
cd biometric-bridge
pm2 start index.js --name biometric-bridge

# Configure auto-start
pm2 save
pm2 startup
```

## Key Points to Remember

1. **Bridge must stay running** - If you close the terminal, bridge stops
2. **Same network** - Bridge computer and device must be on same network
3. **Static IP** - Device should have static IP (or DHCP reservation)
4. **Employee IDs** - Must contain numbers that match device UIDs
5. **Port 3001** - Bridge runs on this port (configurable)
6. **Port 4370** - Default for ZKTeco devices (check your device)

## What You've Accomplished

✓ Bridge service installed and configured
✓ Device connected and tested
✓ Device registered in application
✓ Ready to enroll fingerprints
✓ Auto-sync configured

## Next Steps

1. Enroll all employees
2. Test attendance scanning
3. Set up bridge as a service
4. Add more devices (repeat steps 6-7)
5. Configure attendance policies

---

**Time spent:** ~10 minutes
**Status:** Fully operational attendance system 🎉
