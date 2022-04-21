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
