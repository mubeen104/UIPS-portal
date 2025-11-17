import { supabase } from './supabase';

export interface DeviceConnectionResult {
  success: boolean;
  online: boolean;
  message: string;
  deviceInfo?: any;
  error?: string;
}

export interface EnrollmentResult {
  success: boolean;
  templateData?: string;
  qualityScore?: number;
  message: string;
  error?: string;
}

export class BiometricDeviceSDK {
  private baseUrl: string;
  private session: any;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }
    this.session = session;
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  async testConnection(deviceId: string): Promise<DeviceConnectionResult> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/biometric-device-connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'test',
          deviceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          online: false,
          message: result.error || 'Connection test failed',
          error: result.error,
        };
      }

      return {
        success: result.success,
        online: result.data.online,
        message: result.data.message,
        deviceInfo: result.data.deviceInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        online: false,
        message: error.message || 'Network error',
        error: error.message,
      };
    }
  }

  async enrollFingerprint(
    deviceId: string,
    employeeId: string,
    fingerIndex: number,
    onProgress?: (progress: number, status: string) => void
  ): Promise<EnrollmentResult> {
    try {
      const headers = await this.getAuthHeaders();

      if (onProgress) {
        onProgress(10, 'Connecting to device...');
      }

      const response = await fetch(`${this.baseUrl}/biometric-device-connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'enroll',
          deviceId,
          employeeId,
          fingerIndex,
        }),
      });

      if (onProgress) {
        onProgress(50, 'Waiting for fingerprint...');
      }

      const result = await response.json();

      if (onProgress) {
        onProgress(80, 'Processing template...');
      }

      if (!response.ok || !result.success) {
        return {
          success: false,
          message: result.error || 'Enrollment failed',
          error: result.error,
        };
      }

      if (onProgress) {
        onProgress(100, 'Complete!');
      }

      return {
        success: true,
        templateData: result.data.templateData,
        qualityScore: result.data.qualityScore,
        message: result.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
        error: error.message,
      };
    }
  }

  async verifyFingerprint(deviceId: string, templateData: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/biometric-device-connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify',
          deviceId,
          templateData,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Verification failed');
    }
  }

  async syncDeviceTime(deviceId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/biometric-device-connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'syncTime',
          deviceId,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Time sync failed');
    }
  }

  async getDeviceUsers(deviceId: string): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/biometric-device-connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'getUsers',
          deviceId,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get users');
    }
  }

  getFingerIndexFromPosition(position: string): number {
    const mapping: { [key: string]: number } = {
      'left_thumb': 0,
      'left_index': 1,
      'left_middle': 2,
      'left_ring': 3,
      'left_pinky': 4,
      'right_thumb': 5,
      'right_index': 6,
      'right_middle': 7,
      'right_ring': 8,
      'right_pinky': 9,
    };
    return mapping[position] || 0;
  }
}

export const deviceSDK = new BiometricDeviceSDK();
