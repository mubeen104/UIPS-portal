import ZKLib from 'node-zklib';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node test-connection.js <ip-address> [port]');
  console.log('Example: node test-connection.js 192.168.1.201 4370');
  process.exit(1);
}

const ip = args[0];
const port = parseInt(args[1]) || 4370;

console.log('\n=== ZKTeco K40 Connection Test ===\n');
console.log(`Testing connection to: ${ip}:${port}`);
console.log('Timeout: 10 seconds\n');

async function testConnection() {
  let zkDevice = null;

  try {
    console.log('Step 1: Creating socket connection...');
    zkDevice = new ZKLib(ip, port, 10000, 4000);
    await zkDevice.createSocket();
    console.log('✓ Socket connected successfully\n');

    console.log('Step 2: Getting device information...');
    const deviceInfo = await zkDevice.getInfo();
    console.log('✓ Device info retrieved:\n');
    console.log('  Model:', deviceInfo.model || 'Unknown');
    console.log('  Serial Number:', deviceInfo.serialNumber || 'Unknown');
    console.log('  Firmware:', deviceInfo.firmware || 'Unknown');
    console.log('  Platform:', deviceInfo.platform || 'Unknown');
    console.log('  Device Name:', deviceInfo.deviceName || 'Unknown');
    console.log('');

    console.log('Step 3: Getting user count...');
    const users = await zkDevice.getUsers();
    const userCount = users?.data?.length || 0;
    console.log(`✓ Found ${userCount} enrolled users\n`);

    console.log('Step 4: Getting attendance records...');
    const attendance = await zkDevice.getAttendances();
    const recordCount = attendance?.data?.length || 0;
    console.log(`✓ Found ${recordCount} attendance records\n`);

    console.log('=== Test Result: SUCCESS ===\n');
    console.log('Your K40 device is properly connected and responding.');
    console.log('You can now use this device in your HR application.\n');
    console.log('Next steps:');
    console.log('1. Start bridge service: npm start');
    console.log('2. Register device in web UI');
    console.log('3. Use IP:', ip);
    console.log('4. Use Port:', port);
    console.log('5. Select Protocol: ZKTeco\n');

    zkDevice.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Connection failed!\n');
    console.error('Error:', error.message);
    console.error('');

    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      console.log('Possible causes:');
      console.log('  - Device is powered off');
      console.log('  - Wrong IP address');
      console.log('  - Device on different network/subnet');
      console.log('  - Firewall blocking port', port);
      console.log('');
      console.log('Try these:');
      console.log(`  - Ping device: ping ${ip}`);
      console.log(`  - Test port: telnet ${ip} ${port}`);
      console.log('  - Check device network settings on K40 menu');
      console.log('  - Verify this computer is on same network as K40');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Possible causes:');
      console.log('  - Device is offline');
      console.log('  - Wrong port number (K40 default is 4370)');
      console.log('  - Device communication service not running');
      console.log('');
      console.log('Try these:');
      console.log('  - Check K40 is powered on');
      console.log('  - Verify port in K40 menu: Communication → Network → Port');
      console.log('  - Restart K40 device');
    } else if (error.code === 'EHOSTUNREACH') {
      console.log('Possible causes:');
      console.log('  - Device not on network');
      console.log('  - Wrong subnet');
      console.log('  - Network routing issue');
      console.log('');
      console.log('Try these:');
      console.log(`  - Ping device: ping ${ip}`);
      console.log('  - Check network cable');
      console.log('  - Verify subnet mask on K40');
    } else {
      console.log('Possible causes:');
      console.log('  - Device might not be a ZKTeco device');
      console.log('  - Firmware incompatibility');
      console.log('  - Device requires authentication');
      console.log('');
      console.log('Try these:');
      console.log('  - Verify device model is K40 or compatible');
      console.log('  - Check firmware version');
      console.log('  - Try different IP/port combination');
    }

    console.log('');

    if (zkDevice) {
      try {
        zkDevice.disconnect();
      } catch (e) {
        // Ignore
      }
    }

    process.exit(1);
  }
}

testConnection();
