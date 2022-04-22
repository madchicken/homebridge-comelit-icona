import { IconaPlatform } from '../icona-platform';
import { Logger, PlatformAccessory, Service } from 'homebridge';
import { IconaBridgeClient } from 'comelit-client';
import { ConfigurationResponse, DoorItem } from 'comelit-client';
import { IconaPlatformConfig } from '../index';
import { getDeviceConfigOrDefault } from '../utils';
import Timeout = NodeJS.Timeout;
import { DeviceConfig, SupportedTypes } from '../types';

export class DoorAccessory {
  private readonly platform: IconaPlatform;
  private readonly accessory: PlatformAccessory;
  private readonly log: Logger;
  private readonly config: IconaPlatformConfig;

  private service: Service;

  private closeTimeout: Timeout;
  private closingTimeout: Timeout;
  private client: IconaBridgeClient;

  constructor(
    platform: IconaPlatform,
    accessory: PlatformAccessory,
    config: IconaPlatformConfig,
    log: Logger
  ) {
    this.platform = platform;
    this.accessory = accessory;
    this.config = config;
    this.log = log;
    const Characteristic = this.platform.Characteristic;

    const doorItem = this.getDoorItem();
    const deviceConfig = getDeviceConfigOrDefault(this.config, doorItem);

    const infoService =
      this.accessory.getService(this.platform.Service.AccessoryInformation) ||
      this.accessory.addService(this.platform.Service.AccessoryInformation);
    infoService.getCharacteristic(this.platform.Characteristic.Manufacturer).setValue('Comelit');
    infoService.getCharacteristic(this.platform.Characteristic.Model).setValue('ICONA');

    switch (deviceConfig.type) {
      case SupportedTypes.door:
        this.log.info(`Mounting ${this.accessory.displayName} as Door`);
        this.service =
          this.accessory.getService(this.platform.Service.Door) ||
          this.accessory.addService(this.platform.Service.Door);
        this.service.getCharacteristic(Characteristic.TargetPosition).setProps({
          unit: null,
          minValue: 0,
          maxValue: 1,
          minStep: 1,
          validValues: [0, 1],
        });
        this.service.getCharacteristic(Characteristic.CurrentPosition).setProps({
          unit: null,
          minValue: 0,
          maxValue: 1,
          minStep: 1,
          validValues: [0, 1],
        });
        this.service
          .getCharacteristic(Characteristic.TargetPosition)
          .onSet(this.handleTargetPositionSet.bind(this));
        break;
      case SupportedTypes.garage_door:
        this.log.info(`Mounting ${this.accessory.displayName} as Garage Door`);
        this.service =
          this.accessory.getService(this.platform.Service.GarageDoorOpener) ||
          this.accessory.addService(this.platform.Service.GarageDoorOpener);
        this.service
          .getCharacteristic(Characteristic.CurrentDoorState)
          .updateValue(Characteristic.CurrentDoorState.CLOSED);
        this.service
          .getCharacteristic(Characteristic.TargetDoorState)
          .onSet(this.handleTargetPositionSet.bind(this));
        break;
      case SupportedTypes.lock:
      default:
        this.log.info(`Mounting ${this.accessory.displayName} as Lock`);
        this.service =
          this.accessory.getService(this.platform.Service.LockMechanism) ||
          this.accessory.addService(this.platform.Service.LockMechanism);
        this.service.getCharacteristic(Characteristic.LockCurrentState).setProps({
          validValues: [
            Characteristic.LockCurrentState.UNSECURED,
            Characteristic.LockCurrentState.SECURED,
          ],
        });
        this.service
          .getCharacteristic(Characteristic.LockTargetState)
          .onSet(this.handleTargetPositionSet.bind(this));
    }
  }

  private async initClient() {
    const client = new IconaBridgeClient(this.config.bridge_url, this.config.bridge_port, this.log);
    await client.connect();
    const code = await client.authenticate(this.config.icona_token);
    if (code === 200) {
      const addressBookAll = this.getAddressBookAll();
      await client.openDoorInit(addressBookAll.vip);
      this.client = client;
    } else {
      await client.shutdown();
      this.client = null;
      throw new Error(`Error during authentication (${code})`);
    }
  }
  /**
   * Handle requests to set the "Target Position" characteristic
   */
  async handleTargetPositionSet(value) {
    this.log.debug('Triggered SET TargetPosition:' + value);
    try {
      await this.initClient();
      this.log.info(`ICONA Client initialized`);
    } catch (e) {
      this.log.info(`ICONA Client failed to initialize: ${e.message}`);
    }
    if (this.client) {
      const addressBookAll = this.getAddressBookAll();
      const doorItem = this.getDoorItem();
      const deviceConfig = getDeviceConfigOrDefault(this.config, doorItem);
      await this.client.openDoor(addressBookAll.vip, doorItem);
      await this.client.shutdown();
      this.client = null;
      clearTimeout(this.closeTimeout);
      clearTimeout(this.closingTimeout);
      switch (deviceConfig.type) {
        case SupportedTypes.door:
          this.handleAsDoor(deviceConfig);
          break;
        case SupportedTypes.garage_door:
          this.handleAsGarageDoor(deviceConfig);
          break;
        case SupportedTypes.lock:
        default:
          this.handleAsLock(deviceConfig);
      }
    } else {
      this.log.error(`ICONA Authentication failed`);
    }
  }

  private handleAsLock(deviceConfig: DeviceConfig) {
    const Characteristic = this.platform.Characteristic;
    this.service
      .getCharacteristic(Characteristic.LockTargetState)
      .updateValue(Characteristic.LockTargetState.UNSECURED);
    this.closeTimeout = setTimeout(() => {
      this.service
        .getCharacteristic(Characteristic.LockTargetState)
        .updateValue(Characteristic.LockTargetState.SECURED);
    }, deviceConfig.opened_time * 1000);
  }

  private handleAsDoor(deviceConfig: DeviceConfig) {
    const Characteristic = this.platform.Characteristic;
    this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(1);
    this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(1);
    this.closeTimeout = setTimeout(() => {
      this.service
        .getCharacteristic(Characteristic.PositionState)
        .updateValue(Characteristic.PositionState.STOPPED);
      this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(0);
      this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(0);
    }, deviceConfig.opened_time * 1000);
  }

  private handleAsGarageDoor(deviceConfig: DeviceConfig) {
    const Characteristic = this.platform.Characteristic;
    this.service
      .getCharacteristic(Characteristic.CurrentDoorState)
      .updateValue(Characteristic.CurrentDoorState.OPENING);
    this.service
      .getCharacteristic(Characteristic.TargetDoorState)
      .updateValue(Characteristic.TargetDoorState.OPEN);
    setTimeout(() => {
      this.service
        .getCharacteristic(Characteristic.CurrentDoorState)
        .updateValue(Characteristic.CurrentDoorState.OPEN);
      this.closeTimeout = setTimeout(() => {
        this.service
          .getCharacteristic(Characteristic.CurrentDoorState)
          .updateValue(Characteristic.CurrentDoorState.CLOSING);
        this.service
          .getCharacteristic(Characteristic.TargetDoorState)
          .updateValue(Characteristic.TargetDoorState.CLOSED);
        this.closingTimeout = setTimeout(() => {
          this.service
            .getCharacteristic(Characteristic.CurrentDoorState)
            .updateValue(Characteristic.CurrentDoorState.CLOSED);
        }, deviceConfig.opening_time * 1000);
      }, deviceConfig.opened_time * 1000);
    }, deviceConfig.closing_time * 1000);
  }

  private getDoorItem() {
    return this.accessory.context.doorItem as DoorItem;
  }

  private getAddressBookAll() {
    return this.accessory.context.addressBookAll as ConfigurationResponse;
  }
}
