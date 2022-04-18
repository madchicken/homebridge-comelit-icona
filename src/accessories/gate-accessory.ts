import { IconaPlatform } from '../icona-platform';
import { Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { IconaBridgeClient } from 'comelit-client/dist/icona-bridge-client';
import { ConfigurationResponse, DoorItem } from 'comelit-client';
import Timeout = NodeJS.Timeout;

export class GateAccessory {
  private readonly platform: IconaPlatform;
  private readonly accessory: PlatformAccessory;
  private readonly log: Logger;
  private readonly config: PlatformConfig;

  private service: Service;

  private closeTimeout: Timeout;
  private closingTimeout: Timeout;

  constructor(
    platform: IconaPlatform,
    accessory: PlatformAccessory,
    config: PlatformConfig,
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

  /**
   * Handle requests to set the "Target Position" characteristic
   */
  async handleTargetPositionSet(value) {
    this.log.debug('Triggered SET TargetPosition:' + value);
    const client = new IconaBridgeClient(this.config.bridge_url, this.config.bridge_port, this.log);
    await client.connect();
    const code = await client.authenticate(this.config.icona_token);
    if (code === 200) {
      const addressBookAll = this.accessory.context.addressBookAll as ConfigurationResponse;
      const doorItem = this.accessory.context.doorItem as DoorItem;
      const ctpp = await client.openDoorInit(addressBookAll.vip);
      await client.openDoor(addressBookAll.vip, doorItem, ctpp);
      clearTimeout(this.closeTimeout);
      clearTimeout(this.closingTimeout);
      const Characteristic = this.platform.Characteristic;
      this.service
        .getCharacteristic(Characteristic.PositionState)
        .updateValue(Characteristic.PositionState.INCREASING);
      this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(100);
      setTimeout(() => {
        this.service
          .getCharacteristic(Characteristic.PositionState)
          .updateValue(Characteristic.PositionState.STOPPED);
        this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(100);
        this.closeTimeout = setTimeout(() => {
          this.service
            .getCharacteristic(Characteristic.PositionState)
            .updateValue(Characteristic.PositionState.DECREASING);
          this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(0);
          this.closingTimeout = setTimeout(() => {
            this.service
              .getCharacteristic(Characteristic.PositionState)
              .updateValue(Characteristic.PositionState.STOPPED);
            this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(0);
          }, 10 * 1000);
        }, 30 * 1000);
      }, 10 * 1000);
    } else {
      this.log.error(`ICONA Authentication failed with code ${code}`);
    }
  }
}
