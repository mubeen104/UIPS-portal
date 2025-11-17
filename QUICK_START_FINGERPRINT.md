# Quick Start: Connecting Fingerprint Devices

## The Problem

Your fingerprint devices won't connect because they use **proprietary TCP protocols**, not HTTP. Cloud applications can't directly communicate with local network devices.

## The Solution

Use the **Local Bridge Service** that runs on your network and acts as a translator between the cloud app and your devices.

## Quick Setup (5 Minutes)

### 1. Start the Bridge Service

```bash
cd biometric-bridge
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm start
```

Bridge runs on: `http://localhost:3001`

### 2. Add Your Device

In the app:
1. Go to **Biometric** → **Devices**
2. Click **"Add Device"**
3. Fill in:
   - Device Name: "Main Scanner"
   - Protocol: Select your device type (ZKTeco, Anviz, etc.)
   - IP Address: Your device's IP (e.g., 192.168.1.100)
   - Port: Usually 4370
   - Location: "Main Entrance"

### 3. Test Connection

1. Click **"Show Guide"** button for help
2. Click **"Test"** on your device card
3. Check browser console for diagnostics

**Expected Results:**
- ✅ Success: "Device is reachable. TCP connection successful"
- ❌ Failed: Check error message and troubleshooting steps

### 4. Enroll Fingerprints

1. Go to **Biometric** → **Enrollment**
2. Select employee
3. Select online device
4. Click **"Test"** to verify
5. Click **"Start Enrollment"**
6. Place finger on scanner

## Current Status

### What Works Now:
- ✅ Device registration
- ✅ TCP connection testing
- ✅ Network diagnostics
- ✅ Simulated enrollment (for testing)

### What Requires More Setup:
- ⚠️ Real fingerprint enrollment (needs device SDK)
- ⚠️ Attendance sync (needs protocol implementation)

## For Real Device Communication

The bridge service currently uses **simulated mode**. For actual device communication:

### Option 1: Use Manufacturer SDKs
Install device-specific libraries:
- **ZKTeco**: `npm install node-zklib`
- **Python option**: Use `pyzk` library

### Option 2: Implement Protocol
Study your device's protocol documentation and implement binary communication in the bridge service.

### Option 3: Third-Party Solutions
Consider commercial middleware solutions that handle multiple device types.

## Troubleshooting

### Device Won't Connect

**Check:**
1. Device is powered on
2. IP address is correct
3. Device is on same network as bridge
4. Firewall isn't blocking port
5. Ping device: `ping 192.168.1.100`

**Test TCP port:**
```bash
telnet 192.168.1.100 4370
# or
nc -zv 192.168.1.100 4370
```

### Bridge Won't Start

**Check:**
1. Node.js version: `node --version` (need 18+)
2. Port availability: `lsof -i :3001`
3. Environment variables in `.env`

### Enrollment Not Working

**Remember:** Currently runs in simulated mode. For real enrollment:
1. Install device SDK
2. Implement protocol in bridge
3. Test with actual hardware

## Network Architecture

```
Your App (Cloud)
      ↓
Bridge Service (Your Computer/Server: localhost:3001)
      ↓
Fingerprint Device (Local Network: 192.168.1.100:4370)
```

## Getting Help

1. Click **"Show Guide"** button in Device Management
2. Check browser console for detailed diagnostics
3. Review bridge console logs
4. Read `FINGERPRINT_DEVICE_SETUP.md` for full documentation

## Key Files

- `biometric-bridge/` - Local bridge service
- `FINGERPRINT_DEVICE_SETUP.md` - Full setup guide
- `biometric-bridge/README.md` - Bridge documentation

## Next Steps

1. **Test with simulated mode** to verify app workflow
2. **Choose device SDK** for your device type
3. **Implement in bridge** for real communication
4. **Test with hardware** before production
5. **Set up auto-start** for bridge service

## Important Notes

- Bridge must run on same network as devices
- Devices typically use proprietary protocols
- Each device brand needs specific implementation
- Simulated mode is safe for testing
- Production requires real protocol implementation

## Support Resources

- ZKTeco: https://github.com/caosbad/node-zklib
- Python ZK: https://github.com/kumaraguruv/pyzk
- Anviz: Check manufacturer documentation
- eSSL: Similar to ZKTeco protocol
