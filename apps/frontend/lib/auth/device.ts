/**
 * Utility for device identification and metadata capture
 */

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  platform: string;
  app_version: string;
  user_agent: string;
}

/**
 * Gets or generates a persistent device ID
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Gets a descriptive device name from user agent and other properties
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  const ua = navigator.userAgent;
  
  // Basic platform detection
  let os = 'Unknown OS';
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'macOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('like Mac') !== -1) os = 'iOS';
  
  // Basic browser detection
  let browser = 'Unknown Browser';
  if (ua.indexOf('Edg') !== -1) browser = 'Edge';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  
  // Detect Electron
  const isElectron = !!(window as any).electron;
  const suffix = isElectron ? ' (Desktop)' : ' (Web)';
  
  return `${browser} on ${os}${suffix}`;
}

/**
 * Gets the software platform
 */
export function getPlatform(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.indexOf('Win') !== -1) return 'Windows';
  if (ua.indexOf('Mac') !== -1) return 'macOS';
  if (ua.indexOf('Linux') !== -1) return 'Linux';
  return 'Web';
}

/**
 * Gets the app version (mocked for now, could be pulled from package.json or electron)
 */
export function getAppVersion(): string {
  return '1.0.0'; // Default version
}

/**
 * Gets complete device info
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    device_id: getDeviceId(),
    device_name: getDeviceName(),
    platform: getPlatform(),
    app_version: getAppVersion(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  };
}
