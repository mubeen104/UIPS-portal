# Fingerprint Device Connection Guide

## Overview

This guide explains how to properly connect and configure fingerprint devices with your HR application.

## Understanding the Problem

Most fingerprint devices (ZKTeco, Anviz, eSSL, etc.) use **proprietary TCP protocols**, not HTTP/REST APIs. This creates connectivity challenges:

1. **Protocol Mismatch**: Devices don't speak HTTP - they use binary TCP protocols
2. **Network Isolation**: Devices are typically on local networks behind NAT/firewalls
3. **Cloud Access**: Cloud applications (like Supabase Edge Functions) cannot directly access local network devices

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Application                        │
│                  (Supabase Edge Functions)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Local Bridge Service (Optional)                │
│           Runs on your network (Port 3001)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ TCP Protocol
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Fingerprint Devices                        │
│          (ZKTeco, Anviz, eSSL, etc.)                       │
│              IP: 192.168.x.x, Port: 4370                   │
└─────────────────────────────────────────────────────────────┘
```

## Connection Methods

### Method 1: Direct TCP Connection (Recommended for Development)

The application now includes TCP connection testing that checks network reachability.

**Requirements:**
- Devices accessible from Supabase Edge Functions
- Public IP or VPN tunnel to local network
- Firewall rules allowing inbound connections

**Limitations:**
- Only tests connectivity, doesn't perform actual device operations
- Most fingerprint devices don't expose HTTP APIs
- Falls back to simulated mode for enrollment

### Method 2: Local Bridge Service (Recommended for Production)

A Node.js service that runs on your local network and bridges cloud application to devices.

**Advantages:**
- Works with devices behind NAT/firewall
- Handles proprietary TCP protocols
- Can be extended with device-specific SDKs
- Better security (devices stay private)

## Setup Instructions

### Step 1: Configure Devices in Application

1. Navigate to **Biometric** → **Devices** tab
2. Click **"Show Guide"** to see detailed setup instructions
3. Click **"Add Device"** to register a new device

**Required Information:**
- Device Name (e.g., "Main Entrance Scanner")
- Device ID/Serial Number
- Protocol (ZKTeco, Anviz, eSSL, etc.)
- Location
- IP Address (e.g., 192.168.1.100)
- Port (typically 4370 for TCP devices)
- Device Password (if authentication required)

### Step 2: Test Connection

1. Click **"Test"** button on the device card
2. Check the results:
   - ✅ **Success**: Device is reachable, TCP connection works
   - ❌ **Failed**: Check error message and console for diagnostics

**Common Test Results:**

- **"TCP connection successful"**: Device is online and reachable
- **"Connection timeout"**: Device unreachable (check network/IP)
- **"Connection refused"**: Wrong port or device offline
- **"Requires local bridge service"**: Serial/USB devices need bridge

### Step 3: Install Local Bridge Service (If Needed)

If devices are on a local network or use proprietary protocols:

```bash
# Navigate to bridge directory
cd biometric-bridge

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

**Configure .env:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BRIDGE_PORT=3001
BRIDGE_SECRET=your-random-secret-key
```

**Start the bridge:**
```bash
npm start
```

The bridge will run on `http://localhost:3001`

### Step 4: Verify Bridge is Running

```bash
# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"healthy","version":"1.0.0","uptime":123.45,"timestamp":"..."}
```

### Step 5: Enroll Fingerprints

1. Go to **Biometric** → **Enrollment** tab
2. Select an employee
3. Select an online device
4. Click **"Test"** to verify device connection
5. Choose finger position
6. Click **"Start Enrollment"**
7. Place finger on physical device scanner
8. Wait for enrollment to complete

## Troubleshooting

### Device Shows Offline

**Possible Causes:**
- Device is powered off
- Incorrect IP address or port
- Firewall blocking connection
- Device on different network/VLAN

**Solutions:**
1. Verify device is powered on
2. Ping the device IP from your server: `ping 192.168.1.100`
3. Check firewall rules
4. Ensure server and device are on same network
5. Use local bridge service if behind NAT

### Connection Timeout

**Possible Causes:**
- Network unreachable
- Wrong IP address
- Firewall blocking outbound connections

**Solutions:**
1. Verify IP address is correct
2. Check routing and network connectivity
3. Use `telnet 192.168.1.100 4370` to test TCP connection
4. Install local bridge service

### Enrollment Fails

**Possible Causes:**
- Device not in enrollment mode
- Device memory full
- Wrong protocol selected
- Communication error

**Solutions:**
1. Ensure device is online (test connection first)
2. Check device has available memory
3. Verify correct protocol is selected
4. Check device logs on bridge console
5. Try re-testing device connection

### Bridge Service Won't Start

**Possible Causes:**
- Port 3001 already in use
- Missing environment variables
- Node.js version too old

**Solutions:**
1. Check port availability: `lsof -i :3001`
2. Verify `.env` file is configured
3. Ensure Node.js 18+ is installed: `node --version`
4. Check bridge logs for specific errors

## Device-Specific Notes

### ZKTeco Devices
- Default port: 4370
- Protocol: TCP (proprietary)
- Most common brand
- Requires ZKTeco SDK or zklib for full functionality

### Anviz Devices
- Default port: 5010
- Protocol: TCP (proprietary)
- CGI interface on some models
- Check model documentation

### eSSL Devices
- Default port: 4370
- Protocol: Similar to ZKTeco
- Often compatible with ZKTeco protocol

### Suprema/Virdi
- Default port: 1470
- Protocol: TCP with SSL option
- May have REST API on newer models

## Current Implementation Status

### ✅ Implemented Features

- Device registration and management
- TCP connection testing with detailed diagnostics
- Device online/offline status monitoring
- Simulated enrollment for testing
- Connection troubleshooting guide
- Local bridge service framework

### ⚠️ Simulated Features

- Fingerprint enrollment (generates test data)
- Attendance log sync
- Device user management

### 🔨 Requires Device-Specific Implementation

For **real device communication**, you need to implement device-specific protocols:

**Option 1: Use Manufacturer SDKs**
- ZKTeco: zkemkeeper.dll or pyzk library
- Anviz: Anviz SDK
- Suprema: BioStar SDK

**Option 2: Implement Binary Protocols**
- Study device protocol documentation
- Implement TCP communication in bridge service
- Handle binary packet encoding/decoding

**Option 3: Use Third-Party Libraries**
- `node-zklib` for ZKTeco devices
- `pyzk` for Python-based bridges
- `anviz-crosschex` for Anviz devices

## Security Considerations

1. **Network Security**
   - Keep devices on isolated VLAN
   - Use strong device passwords
   - Restrict bridge service to local network

2. **Data Security**
   - Fingerprint templates are encrypted
   - Stored in Supabase database with RLS
   - Never expose raw biometric data

3. **Bridge Security**
   - Use strong BRIDGE_SECRET
   - Run bridge behind firewall
   - Consider HTTPS for bridge if exposed externally
   - Regularly update dependencies

## Next Steps

1. **For Development/Testing:**
   - Use simulated enrollment
   - Test with registered devices
   - Verify data flows correctly

2. **For Production:**
   - Install local bridge service
   - Implement device-specific protocols
   - Test with actual hardware
   - Set up monitoring and logging
   - Configure automatic startup

3. **For Scaling:**
   - Deploy bridge as a service (systemd/PM2)
   - Monitor bridge health
   - Implement failover
   - Set up centralized logging

## Support

For additional help:
1. Check browser console for detailed error messages
2. Review bridge service logs
3. Consult device manufacturer documentation
4. Check device firmware version compatibility

## Useful Commands

```bash
# Test TCP connection manually
telnet 192.168.1.100 4370

# Check if port is accessible
nc -zv 192.168.1.100 4370

# Ping device
ping 192.168.1.100

# Check bridge logs
npm start
# (logs display in console)

# Run bridge as background service
pm2 start index.js --name biometric-bridge
pm2 logs biometric-bridge
```

## Resources

- [ZKTeco Protocol Documentation](https://github.com/dnaextrim/python_zklib)
- [Node ZKLib](https://github.com/caosbad/node-zklib)
- [PyZK Python Library](https://github.com/kumaraguruv/pyzk)
- [Anviz Protocol](https://www.anviz.com/support/downloads)
