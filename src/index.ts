import { API, HAP, PlatformAccessory, PlatformConfig } from 'homebridge';
import { IconaPlatform } from './icona-platform';
import { DeviceConfig } from './types';

export const PLUGIN_NAME = 'homebridge-comelit-icona';
export const PLATFORM_NAME = 'Icona';

export let hap: HAP;
export let Accessory: typeof PlatformAccessory;

export interface IconaPlatformConfig extends PlatformConfig {
  icona_token: string;
  bridge_url: string;
  bridge_port: number;
  devices?: DeviceConfig[];
}

export default function(homebridge: API) {
  hap = homebridge.hap;
  Accessory = homebridge.platformAccessory;

  homebridge.registerPlatform(PLATFORM_NAME, IconaPlatform);
}
