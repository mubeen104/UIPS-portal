import { useState, useEffect } from 'react';
import { Fingerprint, UserCheck, Plus, Trash2, CheckCircle, AlertCircle, Wifi, Loader, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { deviceSDK } from '../../lib/deviceSDK';

interface Employee {
  id: string;
  employee_number: string;
  user_id: string;
  users: {
    full_name: string;
    email: string;
  };
}

interface BiometricTemplate {
  id: string;
  employee_id: string;
  template_type: string;
  finger_position: string | null;
  quality_score: number | null;
  enrolled_at: string;
  is_active: boolean;
}

interface BiometricDevice {
  id: string;
  device_id: string;
  device_name: string;
  location: string;
  ip_address: string;
  port: number;
  is_online: boolean;
  protocol?: {
    name: string;
    manufacturer: string;
    protocol_type: string;
  };
}

export function BiometricEnrollment() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [templates, setTemplates] = useState<BiometricTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureStatus, setCaptureStatus] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<string>('');
  const { showToast } = useToast();

  const [enrollmentData, setEnrollmentData] = useState({
    template_type: 'fingerprint',
    finger_position: 'right_index',
  });

  useEffect(() => {
    fetchEmployees();
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchTemplates(selectedEmployee);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          user_id,
          users (
            full_name,
            email
          )
        `)
        .eq('status', 'active')
        .order('employee_number');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('biometric_devices')
        .select(`
          id,
          device_id,
          device_name,
          location,
          ip_address,
          port,
          is_online,
          protocol:device_protocols(name, manufacturer, protocol_type)
        `)
        .order('device_name');

      if (error) throw error;
      setDevices(data || []);

      if (data && data.length > 0) {
        setSelectedDevice(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      showToast('Failed to load devices', 'error');
    }
  };

  const fetchTemplates = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('biometric_templates')
        .select('*')
        .eq('employee_id', employeeId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showToast('Failed to load biometric data', 'error');
    }
  };

  const handleTestDevice = async () => {
    if (!selectedDevice) {
      showToast('Please select a device', 'error');
      return;
    }

    setTesting(true);
    setDeviceStatus('Testing connection...');

    try {
      const result = await deviceSDK.testConnection(selectedDevice);

      if (result.success && result.online) {
        setDeviceStatus('Device is online and ready!');
        showToast('Device connection successful!', 'success');

        await supabase
          .from('biometric_devices')
          .update({
            is_online: true,
            last_heartbeat: new Date().toISOString(),
          })
          .eq('id', selectedDevice);

        fetchDevices();
      } else {
        setDeviceStatus(`Connection failed: ${result.message}`);
        showToast(result.message, 'error');
      }
    } catch (error: any) {
      setDeviceStatus(`Error: ${error.message}`);
      showToast(error.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      showToast('Please select an employee', 'error');
      return;
    }

    if (!selectedDevice) {
      showToast('Please select a device', 'error');
      return;
    }

    const selectedDeviceData = devices.find(d => d.id === selectedDevice);
    if (!selectedDeviceData?.is_online) {
      showToast('Selected device is offline. Please test connection first.', 'error');
      return;
    }

    try {
      setEnrolling(true);
      setCaptureProgress(0);
      setCaptureStatus('Initializing...');

      const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);
      showToast(`Starting enrollment for ${selectedEmployeeData?.users.full_name}...`, 'info');

      const fingerIndex = deviceSDK.getFingerIndexFromPosition(enrollmentData.finger_position);

      const result = await deviceSDK.enrollFingerprint(
        selectedDevice,
        selectedEmployee,
        fingerIndex,
        (progress, status) => {
          setCaptureProgress(progress);
          setCaptureStatus(status);
        }
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      setCaptureStatus('Saving to database...');
      setCaptureProgress(95);

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('biometric_templates')
        .insert([{
          employee_id: selectedEmployee,
          device_id: selectedDevice,
          template_type: enrollmentData.template_type,
          finger_position: enrollmentData.finger_position,
          template_data: result.templateData,
          quality_score: result.qualityScore,
          enrolled_by: userData.user?.id,
          is_active: true,
        }]);

      if (error) throw error;

      setCaptureProgress(100);
      setCaptureStatus('Enrollment complete!');

      showToast(`Fingerprint enrolled! Quality: ${result.qualityScore}%`, 'success');
      fetchTemplates(selectedEmployee);

      setTimeout(() => {
        setCaptureProgress(0);
        setCaptureStatus('');
      }, 2000);
    } catch (error: any) {
      console.error('Error enrolling template:', error);
      showToast(error.message || 'Failed to enroll biometric', 'error');
      setCaptureProgress(0);
      setCaptureStatus('');
    } finally {
      setEnrolling(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this biometric template?')) return;

    try {
      const { error } = await supabase
        .from('biometric_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      showToast('Template deleted successfully', 'success');
      fetchTemplates(selectedEmployee);
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showToast(error.message || 'Failed to delete template', 'error');
    }
  };

  const fingerPositions = [
    { value: 'left_thumb', label: 'Left Thumb' },
    { value: 'left_index', label: 'Left Index' },
    { value: 'left_middle', label: 'Left Middle' },
    { value: 'left_ring', label: 'Left Ring' },
    { value: 'left_pinky', label: 'Left Pinky' },
    { value: 'right_thumb', label: 'Right Thumb' },
    { value: 'right_index', label: 'Right Index' },
    { value: 'right_middle', label: 'Right Middle' },
    { value: 'right_ring', label: 'Right Ring' },
    { value: 'right_pinky', label: 'Right Pinky' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedDeviceData = devices.find(d => d.id === selectedDevice);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Biometric Enrollment</h2>
        <p className="text-gray-600 mt-1">Enroll employee fingerprints using connected devices</p>
      </div>

      {devices.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">No devices available</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Please add and connect biometric devices in the Devices tab before enrolling fingerprints.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Select Employee
          </h3>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose an employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_number} - {emp.users.full_name}
              </option>
            ))}
          </select>

          {selectedEmployee && (
            <>
              <div className="mt-6">
                <h4 className="font-medium text-gray-800 mb-3">Enrolled Templates</h4>
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500">No biometric data enrolled yet</p>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Fingerprint className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 capitalize">
                              {template.finger_position?.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              Quality: {template.quality_score}%
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-blue-600" />
            Enroll New Biometric
          </h3>

          {!selectedEmployee ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please select an employee to enroll biometric data</p>
            </div>
          ) : (
            <form onSubmit={handleEnroll} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Device
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    disabled={devices.length === 0}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.device_name} - {device.location} ({device.ip_address}:{device.port})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleTestDevice}
                    disabled={!selectedDevice || testing}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testing ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Test
                  </button>
                </div>
                {selectedDeviceData && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Wifi className={`w-4 h-4 ${selectedDeviceData.is_online ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-medium ${selectedDeviceData.is_online ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDeviceData.is_online ? 'Device Online' : 'Device Offline'}
                      </span>
                      <span className="text-gray-500">
                        • {selectedDeviceData.protocol?.manufacturer} {selectedDeviceData.protocol?.protocol_type}
                      </span>
                    </div>
                    {deviceStatus && (
                      <p className="text-sm text-gray-600">{deviceStatus}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Type
                  </label>
                  <select
                    value={enrollmentData.template_type}
                    onChange={(e) =>
                      setEnrollmentData({ ...enrollmentData, template_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="fingerprint">Fingerprint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Finger Position
                  </label>
                  <select
                    value={enrollmentData.finger_position}
                    onChange={(e) =>
                      setEnrollmentData({ ...enrollmentData, finger_position: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {fingerPositions.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-center">
                  <Fingerprint className={`w-24 h-24 mx-auto mb-4 ${enrolling ? 'text-blue-600 animate-pulse' : 'text-blue-600'}`} />

                  {enrolling ? (
                    <>
                      <h4 className="font-semibold text-gray-800 mb-2">{captureStatus}</h4>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${captureProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {captureProgress < 30 ? 'Connecting to device...' :
                         captureProgress < 70 ? 'Place finger on scanner and hold steady...' :
                         'Processing fingerprint data...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-gray-800 mb-2">Ready to Scan</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Click "Start Enrollment" then place finger on the physical device scanner
                      </p>
                      {selectedDevice && selectedDeviceData?.is_online && (
                        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Device ready for enrollment
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={enrolling || devices.length === 0 || !selectedDevice}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {enrolling ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Capturing from device...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Start Enrollment
                    </>
                  )}
                </button>
              </div>

              {selectedDeviceData && !selectedDeviceData.is_online && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-800">Device Offline</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      This device appears to be offline. Click the "Test" button above to verify the connection before enrolling.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-medium text-yellow-800 mb-2">Quick Start Guide</h5>
                <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Select a device and click "Test" to verify connection</li>
                  <li>Choose the finger position to enroll</li>
                  <li>Click "Start Enrollment" to begin</li>
                  <li>Place finger on the physical device scanner when prompted</li>
                  <li>Keep finger steady until capture completes</li>
                  <li>Template will be automatically saved to database</li>
                </ol>
                <p className="text-xs text-yellow-600 mt-2">
                  Note: Device must be online and accessible on the network
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
