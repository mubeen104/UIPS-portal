import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Wifi, CheckCircle, XCircle, Loader, Info, ArrowRight, ArrowLeft } from 'lucide-react';

interface DeviceSetupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

type SetupStep = 'method' | 'discovery' | 'details' | 'test' | 'complete';

interface DiscoveredDevice {
  ip: string;
  port: number;
  online: boolean;
  deviceInfo?: any;
}

export function DeviceSetupWizard({ onComplete, onCancel }: DeviceSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('method');
  const [connectionMethod, setConnectionMethod] = useState<'auto' | 'manual' | 'simulation'>('auto');
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_id: '',
    ip_address: '',
    port: 4370,
    location: '',
    protocol_id: '',
  });

  const [protocols, setProtocols] = useState<any[]>([]);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    const { data } = await supabase
      .from('device_protocols')
      .select('*')
      .order('manufacturer');
    if (data) setProtocols(data);
  };

  const scanQuickIPs = async () => {
    setScanning(true);
    setDiscoveredDevices([]);

    const quickIPs = [
      { ip: '192.168.1.100', port: 4370 },
      { ip: '192.168.1.200', port: 4370 },
      { ip: '192.168.1.201', port: 4370 },
      { ip: '192.168.0.100', port: 4370 },
      { ip: '192.168.0.200', port: 4370 },
      { ip: '10.0.0.100', port: 4370 },
      { ip: '172.16.0.100', port: 4370 },
    ];

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      alert('Authentication required. Please log in again.');
      setScanning(false);
      return;
    }

    const results = await Promise.all(
      quickIPs.map(async ({ ip, port }) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-device-connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'quickTest',
              ip,
              port,
            }),
          });

          const result = await response.json();

          if (result.success && result.data.online) {
            return {
              ip,
              port,
              online: true,
              deviceInfo: result.data.deviceInfo,
            };
          }
        } catch (error) {
          console.error(`Error testing ${ip}:${port}`, error);
        }
        return null;
      })
    );

    const discovered = results.filter(r => r !== null) as DiscoveredDevice[];
    setDiscoveredDevices(discovered);
    setScanning(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-device-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'quickTest',
          ip: deviceForm.ip_address,
          port: deviceForm.port,
        }),
      });

      const result = await response.json();
      setTestResult(result.data);
    } catch (error: any) {
      setTestResult({ online: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const saveDevice = async () => {
    if (!deviceForm.device_name || !deviceForm.ip_address || !deviceForm.protocol_id || !deviceForm.location) {
      alert('Please fill in all required fields');
      return;
    }

    if (connectionMethod !== 'simulation' && !testResult?.online) {
      const confirm = window.confirm(
        'Connection test has not passed. Save device anyway? It will be marked as offline.'
      );
      if (!confirm) return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('biometric_devices')
        .insert([{
          ...deviceForm,
          created_by: userData.user?.id,
          is_active: true,
          is_online: connectionMethod === 'simulation' ? true : (testResult?.online || false),
        }]);

      if (error) throw error;

      setCurrentStep('complete');
    } catch (error: any) {
      alert('Failed to save device: ' + error.message);
    }
  };

  const renderMethodStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Setup Method</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select how you want to connect your biometric device
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => {
            setConnectionMethod('auto');
            setCurrentStep('discovery');
          }}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200">
              <Wifi className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Auto-Discovery (Recommended)</h4>
              <p className="text-sm text-gray-600">
                Automatically scan your network to find biometric devices. Works with most network-connected devices.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                <CheckCircle className="h-4 w-4" />
                <span>Easiest method - No technical knowledge required</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setConnectionMethod('manual');
            setCurrentStep('details');
          }}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200">
              <Info className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Manual Configuration</h4>
              <p className="text-sm text-gray-600">
                Enter device details manually if you know the IP address and port. Best for advanced users.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                <Info className="h-4 w-4" />
                <span>For users who know their device's IP address</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setConnectionMethod('simulation');
            setDeviceForm(prev => ({
              ...prev,
              device_name: 'Simulation Device',
              device_id: 'SIM-' + Date.now(),
              ip_address: '127.0.0.1',
              port: 4370,
              protocol_id: protocols.find(p => p.protocol_type === 'Simulation')?.id || '',
            }));
            setCurrentStep('details');
          }}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200">
              <Loader className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Simulation Mode (Testing)</h4>
              <p className="text-sm text-gray-600">
                Test the system without a physical device. Perfect for demos and testing workflows.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
                <Info className="h-4 w-4" />
                <span>No hardware required - Instant setup</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderDiscoveryStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover Devices</h3>
        <p className="text-sm text-gray-600 mb-6">
          Scan your network to find biometric devices
        </p>
      </div>

      {!scanning && discoveredDevices.length === 0 && (
        <div className="text-center py-8">
          <Wifi className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-900 mb-2">Ready to Scan</h4>
          <p className="text-sm text-gray-600 mb-6">
            Click the button below to search for devices on your network
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={scanQuickIPs}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Scan for Devices
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Scans common IP addresses for biometric devices (takes a few seconds)
          </p>
        </div>
      )}

      {scanning && (
        <div className="text-center py-8">
          <Loader className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h4 className="font-semibold text-gray-900 mb-2">Scanning Network...</h4>
          <p className="text-sm text-gray-600">
            Searching for biometric devices. This may take a few minutes.
          </p>
          {discoveredDevices.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              Found {discoveredDevices.length} device(s) so far...
            </p>
          )}
        </div>
      )}

      {discoveredDevices.length > 0 && !scanning && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Found {discoveredDevices.length} Device(s)
          </h4>
          <div className="space-y-2">
            {discoveredDevices.map((device, index) => (
              <button
                key={index}
                onClick={() => {
                  setDeviceForm(prev => ({
                    ...prev,
                    ip_address: device.ip,
                    port: device.port,
                  }));
                  setCurrentStep('details');
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{device.ip}:{device.port}</p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="text-green-600">Online</span>
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-4 border-t">
        <button
          onClick={() => setCurrentStep('method')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={() => setCurrentStep('details')}
          className="px-4 py-2 text-blue-600 hover:text-blue-700"
        >
          Enter Manually Instead
        </button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Device Details</h3>
        <p className="text-sm text-gray-600 mb-6">
          {connectionMethod === 'simulation' 
            ? 'Configure your simulation device' 
            : 'Enter the device information'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Name *
          </label>
          <input
            type="text"
            required
            value={deviceForm.device_name}
            onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Main Entrance Scanner"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device ID *
          </label>
          <input
            type="text"
            required
            value={deviceForm.device_id}
            onChange={(e) => setDeviceForm({ ...deviceForm, device_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., DEV001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IP Address *
          </label>
          <input
            type="text"
            required
            value={deviceForm.ip_address}
            onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 192.168.1.100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Port *
          </label>
          <input
            type="number"
            required
            value={deviceForm.port}
            onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="4370"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location *
          </label>
          <input
            type="text"
            required
            value={deviceForm.location}
            onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Main Office"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Protocol *
          </label>
          <select
            required
            value={deviceForm.protocol_id}
            onChange={(e) => setDeviceForm({ ...deviceForm, protocol_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Protocol</option>
            {protocols.map(protocol => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.manufacturer} - {protocol.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t">
        <button
          onClick={() => setCurrentStep(connectionMethod === 'auto' ? 'discovery' : 'method')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={() => setCurrentStep('test')}
          disabled={!deviceForm.device_name || !deviceForm.ip_address || !deviceForm.protocol_id}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderTestStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Connection</h3>
        <p className="text-sm text-gray-600 mb-6">
          Verify that the device is reachable and working correctly
        </p>
      </div>

      {!testing && !testResult && (
        <div className="text-center py-8">
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <p className="text-sm text-gray-700">
              <strong>Device:</strong> {deviceForm.device_name}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Address:</strong> {deviceForm.ip_address}:{deviceForm.port}
            </p>
          </div>
          <button
            onClick={testConnection}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Test Connection
          </button>
        </div>
      )}

      {testing && (
        <div className="text-center py-8">
          <Loader className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h4 className="font-semibold text-gray-900 mb-2">Testing Connection...</h4>
          <p className="text-sm text-gray-600">
            Attempting to connect to {deviceForm.ip_address}:{deviceForm.port}
          </p>
        </div>
      )}

      {testResult && (
        <div className={`p-6 rounded-lg ${testResult.online ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-start gap-4">
            {testResult.online ? (
              <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${testResult.online ? 'text-green-900' : 'text-red-900'}`}>
                {testResult.online ? 'Connection Successful!' : 'Connection Failed'}
              </h4>
              <p className={`text-sm ${testResult.online ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-4 border-t">
        <button
          onClick={() => setCurrentStep('details')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex gap-2">
          {testResult && !testResult.online && (
            <button
              onClick={testConnection}
              className="px-4 py-2 text-blue-600 hover:text-blue-700"
            >
              Try Again
            </button>
          )}
          <button
            onClick={saveDevice}
            disabled={!testResult}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Save Device
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-8">
      <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" />
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">Device Added Successfully!</h3>
      <p className="text-gray-600 mb-6">
        Your biometric device has been configured and is ready to use.
      </p>
      <div className="space-y-3">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900 font-medium mb-2">Next Steps:</p>
          <ul className="text-sm text-blue-700 space-y-1 text-left">
            <li>1. Enroll employee fingerprints in the Biometric Enrollment section</li>
            <li>2. Configure automatic synchronization settings if needed</li>
            <li>3. Test with a fingerprint scan to verify everything works</li>
          </ul>
        </div>
      </div>
      <button
        onClick={onComplete}
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Device Setup Wizard</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Step {currentStep === 'method' ? '1' : currentStep === 'discovery' ? '2' : currentStep === 'details' ? '3' : currentStep === 'test' ? '4' : '5'} of 5
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`h-2 flex-1 rounded ${currentStep !== 'method' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`h-2 flex-1 rounded ${['details', 'test', 'complete'].includes(currentStep) ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`h-2 flex-1 rounded ${['test', 'complete'].includes(currentStep) ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`h-2 flex-1 rounded ${currentStep === 'complete' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        </div>
      </div>

      {currentStep === 'method' && renderMethodStep()}
      {currentStep === 'discovery' && renderDiscoveryStep()}
      {currentStep === 'details' && renderDetailsStep()}
      {currentStep === 'test' && renderTestStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
}
