import { API, HAP, PlatformAccessory } from 'homebridge';
import { IconaPlatform } from './icona-platform';

export const PLUGIN_NAME = 'homebridge-comelit-icona';
export const PLATFORM_NAME = 'Icona';

export let hap: HAP;
export let Accessory: typeof PlatformAccessory;

export default function(homebridge: API) {
  hap = homebridge.hap;
  Accessory = homebridge.platformAccessory;

  homebridge.registerPlatform(PLATFORM_NAME, IconaPlatform);
}
