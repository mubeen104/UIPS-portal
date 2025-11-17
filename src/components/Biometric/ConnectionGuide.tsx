import { AlertCircle, CheckCircle, XCircle, Wifi, Server, Network, HelpCircle } from 'lucide-react';

interface ConnectionGuideProps {
  deviceProtocol?: string;
  connectionType?: string;
}

export function ConnectionGuide({ deviceProtocol = 'tcp', connectionType = 'network' }: ConnectionGuideProps) {
  const isTCPDevice = deviceProtocol === 'tcp';
  const requiresBridge = isTCPDevice || ['serial', 'usb'].includes(deviceProtocol);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5" />
        Device Connection Guide
      </h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-blue-800 mb-2">Device Type: {deviceProtocol?.toUpperCase()}</h4>
          <p className="text-sm text-blue-700">
            {isTCPDevice
              ? 'This device uses TCP protocol for communication.'
              : `This device uses ${deviceProtocol?.toUpperCase()} protocol.`}
          </p>
        </div>

        {requiresBridge && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-yellow-800 mb-2">Local Bridge Service Required</h5>
                <p className="text-sm text-yellow-700 mb-3">
                  Most fingerprint devices use proprietary protocols and must be accessed through a local bridge
                  service. The bridge runs on your network and communicates with your devices.
                </p>
                <div className="space-y-2 text-sm text-yellow-700">
                  <p className="font-medium">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Navigate to the biometric-bridge folder in your project</li>
                    <li>Install dependencies: <code className="bg-yellow-100 px-2 py-0.5 rounded">npm install</code></li>
                    <li>Configure your .env file with Supabase credentials</li>
                    <li>Start the bridge: <code className="bg-yellow-100 px-2 py-0.5 rounded">npm start</code></li>
                    <li>The bridge will run on port 3001 by default</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h5 className="font-semibold text-blue-800 mb-3">Connection Checklist</h5>
          <div className="space-y-2">
            <ChecklistItem text="Device is powered on and functioning" />
            <ChecklistItem text="Device has a valid IP address on your network" />
            <ChecklistItem text="Device is reachable via ping from your server/bridge" />
            <ChecklistItem text="No firewall blocking connection to device port" />
            {requiresBridge && <ChecklistItem text="Local bridge service is running" />}
            <ChecklistItem text="Device credentials (if required) are configured correctly" />
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Network Architecture
          </h5>
          <div className="text-sm text-blue-700 space-y-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <span>Cloud Application (Supabase)</span>
            </div>
            <div className="pl-4 border-l-2 border-blue-300">
              {requiresBridge ? (
                <>
                  <div className="flex items-center gap-2 py-1">
                    <Wifi className="w-4 h-4" />
                    <span>Local Bridge Service (Your Network)</span>
                  </div>
                  <div className="pl-4 border-l-2 border-blue-300">
                    <div className="flex items-center gap-2 py-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Fingerprint Devices</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Fingerprint Devices (Direct Connection)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h5 className="font-semibold text-blue-800 mb-2">Common Issues & Solutions</h5>
          <div className="space-y-2 text-sm">
            <TroubleshootItem
              issue="Connection Timeout"
              solution="Device may be on different network or behind firewall. Check IP address and network connectivity."
            />
            <TroubleshootItem
              issue="Connection Refused"
              solution="Device may be offline or service not running. Verify device is powered on and port number is correct."
            />
            <TroubleshootItem
              issue="Device Shows Offline"
              solution="Test connection manually. If behind NAT/firewall, use local bridge service."
            />
            {requiresBridge && (
              <TroubleshootItem
                issue="Bridge Service Not Working"
                solution="Check bridge logs, verify .env configuration, ensure Node.js 18+ is installed."
              />
            )}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-semibold text-green-800 mb-2">Testing Steps</h5>
          <ol className="list-decimal list-inside space-y-1 text-sm text-green-700">
            <li>Click "Test Connection" button on the device card</li>
            <li>Check browser console for detailed diagnostic information</li>
            <li>Review error messages and follow suggested troubleshooting steps</li>
            <li>If successful, device status will show as "Online"</li>
            <li>Proceed with fingerprint enrollment once device is online</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-blue-700">
      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function TroubleshootItem({ issue, solution }: { issue: string; solution: string }) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="flex items-start gap-2">
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-gray-800">{issue}</p>
          <p className="text-gray-600 mt-1">{solution}</p>
        </div>
      </div>
    </div>
  );
}
