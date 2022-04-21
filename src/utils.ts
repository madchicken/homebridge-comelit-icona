import { IconaPlatformConfig } from './index';
import { DoorItem } from 'comelit-client';
import { DeviceConfig, SupportedTypes } from './types';

export const DEFAULT_DOOR_CONFIG = {
  name: '',
  type: SupportedTypes.door,
  opening_time: 20,
  closing_time: 20,
  opened_time: 60,
} as DeviceConfig;

export function getDeviceConfigOrDefault(
  config: IconaPlatformConfig,
  doorItem: DoorItem
): DeviceConfig {
  return (
    config.devices?.find(d => d.name === doorItem.name) || {
      ...DEFAULT_DOOR_CONFIG,
      name: doorItem.name,
    }
  );
}
