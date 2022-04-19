import { IconaPlatformConfig } from './index';
import { DoorItem } from 'comelit-client';

export const DEFAULT_DOOR_CONFIG = {
  type: 'temporized_gate',
  opening_time: 20,
  closing_time: 20,
  opened_time: 60,
};

export function getDeviceConfigOrDefault(config: IconaPlatformConfig, doorItem: DoorItem) {
  return (
    config.devices.find(d => d.name === doorItem.name) || {
      ...DEFAULT_DOOR_CONFIG,
      name: doorItem.name,
    }
  );
}
