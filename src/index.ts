import { API, HAP, PlatformAccessory, PlatformConfig } from 'homebridge';
import { IconaPlatform } from './icona-platform';

export const PLUGIN_NAME = 'homebridge-comelit-icona';
export const PLATFORM_NAME = 'Icona';

export let hap: HAP;
export let Accessory: typeof PlatformAccessory;

export enum SupportedTypes {
  garage_door = 'garage_door',
  door = 'door',
  lock = 'lock',
}

export interface DeviceConfig {
  name: string;
  type: SupportedTypes;
  opening_time: number;
  closing_time: number;
  opened_time: number;
}

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
