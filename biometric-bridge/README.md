# Biometric Device Bridge Service

This bridge service enables communication between your HR application and fingerprint devices that are on your local network.

**✅ Now with REAL ZKTeco K40 support using node-zklib!**

## Why Do You Need This?

Most fingerprint devices (ZKTeco, Anviz, eSSL, etc.) use proprietary TCP protocols and are typically on local networks. They cannot be directly accessed from cloud-based applications due to:

- Network isolation (devices behind NAT/firewall)
- Proprietary binary protocols (not HTTP/REST)
- Security restrictions

This bridge service runs on your local network and acts as a middleman between your cloud application and local devices.

## Architecture

```
Cloud App (Supabase) <---> Bridge Service (Your Network) <---> Fingerprint Devices
```

## Quick Start for ZKTeco K40

**See [K40_SETUP_GUIDE.md](./K40_SETUP_GUIDE.md) for detailed step-by-step instructions!**

### Quick Test Your K40

```bash
# Install dependencies first
npm install

# Test if your K40 is reachable
node test-connection.js 192.168.1.201 4370
```

Replace `192.168.1.201` with your K40's actual IP address.

## Installation

### Prerequisites

- Node.js 18 or higher
- Network access to your fingerprint devices
- Devices should be reachable via IP address
- For ZKTeco devices: node-zklib (included)

### Setup

1. Navigate to the bridge directory:
```bash
cd biometric-bridge
```

2. Install dependencies:
```bash
npm install
```

3. Configure your environment:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BRIDGE_PORT=3001
BRIDGE_SECRET=your_random_secret_key
```

5. Start the bridge:
```bash
npm start
```

## Configuration in Your App

After starting the bridge service:

1. Go to Device Management in your HR app
2. For each device, set the connection type to "bridge"
3. Set the bridge URL to `http://your-bridge-ip:3001`

## Supported Devices

### With Real Protocol Support
- **ZKTeco K40** - Fully supported with node-zklib
- **ZKTeco** - All models with TCP/IP protocol

### With Simulated Mode (for testing)
- Anviz
- eSSL
- Realtime
- Morpho
- Suprema
- Virdi
- Generic biometric devices with TCP protocol

**Note:** For production use with non-ZKTeco devices, you'll need to implement their specific protocols or SDKs.

## Security

- The bridge service should only be accessible within your local network
- Use a strong BRIDGE_SECRET value
- Consider using HTTPS if exposing the bridge outside your local network
- Regularly update the bridge service

## Troubleshooting

### Bridge won't start
- Check that port 3001 is not in use
- Verify your .env configuration
- Check Node.js version (must be 18+)

### Can't connect to devices
- Verify devices are powered on
- Check IP addresses and ports
- Ensure no firewall is blocking connections
- Try pinging devices from the bridge server

### Enrollment fails
- Check device logs in the bridge console
- Verify device supports the operation
- Ensure device memory isn't full
- Check device firmware is up to date

## Logs

Bridge logs are written to:
- Console (stdout)
- `logs/bridge.log` file

## Running as a Service

### Linux (systemd)

Create `/etc/systemd/system/biometric-bridge.service`:

```ini
[Unit]
Description=Biometric Device Bridge Service
After=network.target

[Service]
Type=simple
User=your-user
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
```

### Windows

Use NSSM (Non-Sucking Service Manager) or PM2:

```bash
npm install -g pm2
pm2 start index.js --name biometric-bridge
pm2 save
pm2 startup
```

## API Endpoints

### Health Check
```
GET /health
```

### Test Device Connection
```
POST /device/test
{
  "deviceId": "uuid",
  "ip": "192.168.1.100",
  "port": 4370,
  "protocol": "ZKTeco"
}
```

### Enroll Fingerprint
```
POST /device/enroll
{
  "deviceId": "uuid",
  "ip": "192.168.1.100",
  "port": 4370,
  "protocol": "ZKTeco",
  "employeeId": "uuid",
  "fingerIndex": 0
}
```

## Support

For issues or questions, check the main application documentation or contact your system administrator.
