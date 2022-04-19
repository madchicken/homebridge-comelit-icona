import { IconaPlatform } from '../icona-platform';
import { Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { IconaBridgeClient } from 'comelit-client/dist/icona-bridge-client';
import { ConfigurationResponse, DoorItem } from 'comelit-client';
import Timeout = NodeJS.Timeout;
import { IconaPlatformConfig } from '../index';
import { getDeviceConfigOrDefault } from '../utils';

export class GateAccessory {
  private readonly platform: IconaPlatform;
  private readonly accessory: PlatformAccessory;
  private readonly log: Logger;
  private readonly config: IconaPlatformConfig;

  private service: Service;

  private closeTimeout: Timeout;
  private closingTimeout: Timeout;
  private client: IconaBridgeClient;
  private readonly ctpp: any;

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

    // create a new Door service
    this.service =
      this.accessory.getService(this.platform.Service.Door) ||
      this.accessory.addService(this.platform.Service.Door);

    this.service
      .getCharacteristic(Characteristic.TargetPosition)
      .onSet(this.handleTargetPositionSet.bind(this));
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
      const Characteristic = this.platform.Characteristic;
      if (deviceConfig.type === 'temporized_gate') {
        this.service
          .getCharacteristic(Characteristic.PositionState)
          .updateValue(Characteristic.PositionState.INCREASING);
        this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(100);
        setTimeout(() => {
          this.setGateOpened();
          this.closeTimeout = setTimeout(() => {
            this.service
              .getCharacteristic(Characteristic.PositionState)
              .updateValue(Characteristic.PositionState.DECREASING);
            this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(0);
            this.closingTimeout = setTimeout(() => {
              this.setGateClosed();
            }, deviceConfig.opening_time * 1000);
          }, deviceConfig.opened_time * 1000);
        }, deviceConfig.closing_time * 1000);
      } else {
        this.setGateOpened();
        this.closeTimeout = setTimeout(() => {
          this.setGateClosed();
        }, deviceConfig.opened_time * 1000);
      }
    } else {
      this.log.error(`ICONA Authentication failed`);
    }
  }

  private getDoorItem() {
    return this.accessory.context.doorItem as DoorItem;
  }

  private getAddressBookAll() {
    return this.accessory.context.addressBookAll as ConfigurationResponse;
  }

  private setGateOpened() {
    const Characteristic = this.platform.Characteristic;
    this.service
      .getCharacteristic(Characteristic.PositionState)
      .updateValue(Characteristic.PositionState.STOPPED);
    this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(100);
  }

  private setGateClosed() {
    const Characteristic = this.platform.Characteristic;
    this.service
      .getCharacteristic(Characteristic.PositionState)
      .updateValue(Characteristic.PositionState.STOPPED);
    this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(0);
  }
}
