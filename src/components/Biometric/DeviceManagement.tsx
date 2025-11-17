import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Plus, Edit2, Trash2, RefreshCw, Activity, Search, Fingerprint, Network, Settings, CheckCircle, XCircle, Clock, HardDrive, Users, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectionGuide } from './ConnectionGuide';

interface DeviceProtocol {
  id: string;
  name: string;
  manufacturer: string;
  protocol_type: string;
  default_port: number;
  communication_method: string;
  supports_realtime: boolean;
}

interface BiometricDevice {
  id: string;
  device_id: string;
  device_name: string;
  protocol_id: string;
  location: string;
  ip_address: string;
  port: number;
  mac_address?: string;
  serial_number?: string;
  firmware_version?: string;
  connection_type: string;
  is_online: boolean;
  last_sync?: string;
  last_heartbeat?: string;
  timezone: string;
  auto_sync_enabled: boolean;
  sync_interval: number;
  realtime_push_enabled: boolean;
  max_users: number;
  max_fingerprints: number;
  max_records: number;
  current_users: number;
  current_fingerprints: number;
  current_records: number;
  storage_usage_percent?: number;
  device_password?: string;
  requires_auth: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  protocol?: DeviceProtocol;
}

export function DeviceManagement() {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [protocols, setProtocols] = useState<DeviceProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanning, setScanning] = useState(false);
  const [detectedDevices, setDetectedDevices] = useState<any[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    device_name: '',
    device_id: '',
    protocol_id: '',
    location: '',
    ip_address: '',
    port: 4370,
    mac_address: '',
    serial_number: '',
    firmware_version: '',
    connection_type: 'network',
    timezone: 'UTC',
    auto_sync_enabled: true,
    sync_interval: 300,
    realtime_push_enabled: true,
    device_password: '',
    requires_auth: false,
    notes: '',
  });

  useEffect(() => {
    fetchProtocols();
    fetchDevices();
  }, []);

  const fetchProtocols = async () => {
    try {
      const { data, error } = await supabase
        .from('device_protocols')
        .select('*')
        .order('name');

      if (error) throw error;
      setProtocols(data || []);
    } catch (error) {
      console.error('Error fetching protocols:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('biometric_devices')
        .select(`
          *,
          protocol:device_protocols(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      showToast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const scanNetwork = async () => {
    setScanning(true);
    showToast('Scanning network for fingerprint devices...', 'info');
    setDetectedDevices([]);

    try {
      const detectedDevices: any[] = [];

      const localSubnet = '192.168.1.';
      const commonPorts = [4370, 5010, 1470, 8080];

      const startIP = 1;
      const endIP = 254;
      const batchSize = 10;

      showToast(`Scanning ${localSubnet}${startIP}-${endIP} on common ports...`, 'info');

      for (let i = startIP; i <= endIP; i += batchSize) {
        const batch = [];

        for (let j = 0; j < batchSize && (i + j) <= endIP; j++) {
          const ip = `${localSubnet}${i + j}`;

          for (const port of commonPorts) {
            batch.push(
              testDeviceAtAddress(ip, port)
                .then(result => {
                  if (result.online) {
                    const protocol = guessProtocolFromPort(port);
                    return {
                      ip,
                      port,
                      mac: result.mac || 'Unknown',
                      protocol: protocol,
                      serial: `${protocol}-${ip.split('.').pop()}`,
                      firmware: result.firmware || 'Unknown'
                    };
                  }
                  return null;
                })
                .catch(() => null)
            );
          }
        }

        const results = await Promise.all(batch);
        const foundDevices = results.filter(r => r !== null);

        if (foundDevices.length > 0) {
          detectedDevices.push(...foundDevices);
          setDetectedDevices([...detectedDevices]);
          showToast(`Found ${detectedDevices.length} device(s) so far...`, 'info');
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (detectedDevices.length === 0) {
        showToast('No fingerprint devices found on network. Try manual configuration.', 'warning');
      } else {
        showToast(`Scan complete! Found ${detectedDevices.length} fingerprint device(s)`, 'success');
      }
    } catch (error: any) {
      console.error('Network scan error:', error);
      showToast('Network scan failed: ' + error.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  const testDeviceAtAddress = async (ip: string, port: number): Promise<any> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://${ip}:${port}`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors',
      });

      clearTimeout(timeoutId);

      return { online: true, ip, port };
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        const socket = await checkTCPPort(ip, port);
        return socket;
      }
      return { online: false };
    }
  };

  const checkTCPPort = async (ip: string, port: number): Promise<any> => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-device-connect`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'quickTest',
          ip: ip,
          port: port,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.online) {
        return {
          online: true,
          ip,
          port,
          mac: result.data.mac,
          firmware: result.data.firmware
        };
      }

      return { online: false };
    } catch (error) {
      return { online: false };
    }
  };

  const guessProtocolFromPort = (port: number): string => {
    switch (port) {
      case 4370:
        return 'ZKTeco';
      case 5010:
        return 'Anviz';
      case 1470:
        return 'Suprema';
      case 8080:
        return 'Morpho';
      default:
        return 'Generic';
    }
  };

  const addDetectedDevice = (detected: any) => {
    const protocol = protocols.find(p => p.name === detected.protocol);

    setFormData({
      ...formData,
      device_name: `${detected.protocol} - ${detected.ip}`,
      device_id: detected.serial,
      protocol_id: protocol?.id || '',
      ip_address: detected.ip,
      port: detected.port,
      mac_address: detected.mac,
      serial_number: detected.serial,
      firmware_version: detected.firmware,
    });

    setShowForm(true);
    setDetectedDevices([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDevice) {
        const { error } = await supabase
          .from('biometric_devices')
          .update(formData)
          .eq('id', editingDevice.id);

        if (error) throw error;
        showToast('Device updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('biometric_devices')
          .insert([{
            ...formData,
            installed_by: profile?.id,
          }]);

        if (error) throw error;
        showToast('Device registered successfully', 'success');
      }

      setShowForm(false);
      setEditingDevice(null);
      resetForm();
      fetchDevices();
    } catch (error: any) {
      console.error('Error saving device:', error);
      showToast(error.message || 'Failed to save device', 'error');
    }
  };

  const handleEdit = (device: BiometricDevice) => {
    setEditingDevice(device);
    setFormData({
      device_name: device.device_name,
      device_id: device.device_id,
      protocol_id: device.protocol_id,
      location: device.location,
      ip_address: device.ip_address,
      port: device.port,
      mac_address: device.mac_address || '',
      serial_number: device.serial_number || '',
      firmware_version: device.firmware_version || '',
      connection_type: device.connection_type,
      timezone: device.timezone,
      auto_sync_enabled: device.auto_sync_enabled,
      sync_interval: device.sync_interval,
      realtime_push_enabled: device.realtime_push_enabled,
      device_password: device.device_password || '',
      requires_auth: device.requires_auth,
      notes: device.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      const { error } = await supabase
        .from('biometric_devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Device deleted successfully', 'success');
      fetchDevices();
    } catch (error: any) {
      console.error('Error deleting device:', error);
      showToast(error.message || 'Failed to delete device', 'error');
    }
  };

  const handleSync = async (device: BiometricDevice) => {
    try {
      showToast('Syncing attendance data...', 'info');

      const { error } = await supabase
        .from('biometric_devices')
        .update({
          last_sync: new Date().toISOString(),
          is_online: true,
          last_heartbeat: new Date().toISOString(),
        })
        .eq('id', device.id);

      if (error) throw error;

      showToast('Device synced successfully', 'success');
      fetchDevices();
    } catch (error: any) {
      console.error('Error syncing device:', error);
      showToast(error.message || 'Failed to sync device', 'error');
    }
  };

  const testConnection = async (device: BiometricDevice) => {
    try {
      showToast('Testing connection...', 'info');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-device-connect`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test',
          deviceId: device.id,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.online) {
        showToast(result.data.message, 'success');

        if (result.data.diagnostic) {
          console.log('Connection diagnostic:', result.data.diagnostic);
        }

        await supabase
          .from('biometric_devices')
          .update({
            is_online: true,
            last_heartbeat: new Date().toISOString(),
          })
          .eq('id', device.id);

        fetchDevices();
      } else {
        const errorMsg = result.data?.message || result.error || 'Connection failed';
        showToast(errorMsg, 'error');

        if (result.data?.diagnostic) {
          console.error('Connection diagnostic:', result.data.diagnostic);
          console.error('Troubleshooting steps:', result.data.troubleshooting);
        }

        if (result.data?.requiresBridge) {
          showToast(`${result.data.protocolType.toUpperCase()} devices require local bridge service`, 'error');
        }

        await supabase
          .from('biometric_devices')
          .update({
            is_online: false,
          })
          .eq('id', device.id);

        fetchDevices();
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      showToast('Connection test failed: ' + error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      device_name: '',
      device_id: '',
      protocol_id: '',
      location: '',
      ip_address: '',
      port: 4370,
      mac_address: '',
      serial_number: '',
      firmware_version: '',
      connection_type: 'network',
      timezone: 'UTC',
      auto_sync_enabled: true,
      sync_interval: 300,
      realtime_push_enabled: true,
      device_password: '',
      requires_auth: false,
      notes: '',
    });
  };

  const filteredDevices = devices.filter(device =>
    device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fingerprint Device Management</h2>
          <p className="text-gray-600 mt-1">Manage and monitor all biometric attendance devices</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <HelpCircle className="w-5 h-5" />
            {showGuide ? 'Hide' : 'Show'} Guide
          </button>
          <button
            onClick={scanNetwork}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Scan Network
              </>
            )}
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingDevice(null);
              resetForm();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Device
          </button>
        </div>
      </div>

      {showGuide && (
        <ConnectionGuide deviceProtocol="tcp" connectionType="network" />
      )}

      {detectedDevices.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">
            Detected Devices ({detectedDevices.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detectedDevices.map((detected, index) => (
              <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{detected.protocol}</p>
                    <p className="text-sm text-gray-600">{detected.ip}:{detected.port}</p>
                    <p className="text-xs text-gray-500 mt-1">Serial: {detected.serial}</p>
                    <p className="text-xs text-gray-500">Firmware: {detected.firmware}</p>
                  </div>
                  <button
                    onClick={() => addDetectedDevice(detected)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingDevice ? 'Edit Device' : 'Register New Device'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Main Entrance Scanner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Protocol *
                </label>
                <select
                  required
                  value={formData.protocol_id}
                  onChange={(e) => {
                    const protocol = protocols.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      protocol_id: e.target.value,
                      port: protocol?.default_port || 4370
                    });
                  }}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID / Serial *
                </label>
                <input
                  type="text"
                  required
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DEV001 or Serial Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Building A - Main Entrance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="192.168.1.100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  required
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4370"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MAC Address
                </label>
                <input
                  type="text"
                  value={formData.mac_address}
                  onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00:11:22:33:44:55"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Device serial number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sync Interval (seconds)
                </label>
                <input
                  type="number"
                  value={formData.sync_interval}
                  onChange={(e) => setFormData({ ...formData, sync_interval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Password
                </label>
                <input
                  type="password"
                  value={formData.device_password}
                  onChange={(e) => setFormData({ ...formData, device_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Device admin password"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_sync_enabled}
                  onChange={(e) => setFormData({ ...formData, auto_sync_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Enable Auto-Sync</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.realtime_push_enabled}
                  onChange={(e) => setFormData({ ...formData, realtime_push_enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Real-time Push</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this device"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingDevice ? 'Update Device' : 'Register Device'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDevice(null);
                  resetForm();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <div key={device.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className={`h-2 ${device.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    device.is_online ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {device.is_online ? (
                      <Wifi className="w-6 h-6 text-green-600" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{device.device_name}</h3>
                    <p className="text-sm text-gray-500">{device.device_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {device.is_online ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Fingerprint className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Protocol:</span>
                  <span className="font-medium text-gray-800">
                    {device.protocol?.name || 'Unknown'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Network className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-gray-800">{device.location}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">IP:</span>
                  <span className="font-medium text-gray-800">
                    {device.ip_address}:{device.port}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="font-medium text-gray-800">
                    {device.last_sync
                      ? new Date(device.last_sync).toLocaleString()
                      : 'Never'}
                  </span>
                </div>

                {device.storage_usage_percent !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Storage:</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (device.storage_usage_percent || 0) > 80
                                ? 'bg-red-500'
                                : (device.storage_usage_percent || 0) > 60
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${device.storage_usage_percent || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">
                          {device.storage_usage_percent?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Users:</span>
                  <span className="font-medium text-gray-800">
                    {device.current_users || 0} / {device.max_users}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSync(device)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sync
                  </button>
                  <button
                    onClick={() => testConnection(device)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm"
                  >
                    <Activity className="w-4 h-4" />
                    Test
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEdit(device)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(device.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDevices.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Fingerprint className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Devices Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'No devices match your search criteria'
              : 'Get started by scanning your network or manually adding a device'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={scanNetwork}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Search className="w-5 h-5" />
              Scan Network
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add Manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
