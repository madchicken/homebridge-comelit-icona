import {
  API,
  APIEvent,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { IconaPlatformConfig, PLATFORM_NAME, PLUGIN_NAME } from './index';
import { IconaBridgeClient } from 'comelit-client/dist/icona-bridge-client';
import { GateAccessory } from './accessories/gate-accessory';
import { capitalize } from 'lodash';

export class IconaPlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly PlatformAccessory: typeof PlatformAccessory;

  private readonly accessories: PlatformAccessory[] = [];

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;
    log.info('Icona Platform finished initializing!');
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.PlatformAccessory = this.api.platformAccessory;
    api.on(APIEvent.DID_FINISH_LAUNCHING, this.discoverDevices(config as IconaPlatformConfig));
  }

  private discoverDevices(config: IconaPlatformConfig) {
    return async () => {
      this.log.info('Icona platform: discovering devices...');
      const client = new IconaBridgeClient(config.bridge_url, config.bridge_port, this.log);
      await client.connect();
      const code = await client.authenticate(config.icona_token);
      if (code === 200) {
        const addressBookAll = await client.getConfig('all');
        if (addressBookAll) {
          this.log.info(
            'Available doors: %o',
            addressBookAll.vip['user-parameters']['opendoor-address-book']
          );
          addressBookAll.vip['user-parameters']['opendoor-address-book'].forEach(item => {
            // generate a unique id for the accessory this should be generated from
            // something globally unique, but constant, for example, the device serial
            // number or MAC address
            const uuid = this.api.hap.uuid.generate(
              `${item.name}-${item['apt-address']}:${item['output-index']}`
            );

            // see if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

            if (existingAccessory) {
              // the accessory already exists
              this.log.info(
                'Restoring existing accessory from cache:',
                existingAccessory.displayName
              );
              new GateAccessory(this, existingAccessory, config, this.log);
            } else {
              // the accessory does not yet exist, so we need to create it
              this.log.info('Adding new accessory:', item.name);
              // create a new accessory
              const accessory = new this.api.platformAccessory(
                capitalize(item.name.toLocaleLowerCase()),
                uuid
              );
              // Store icona config data in context
              accessory.context.addressBookAll = addressBookAll;
              accessory.context.doorItem = item;
              new GateAccessory(this, accessory, config, this.log);
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
          });
        } else {
          this.log.error(`No configuration received from ICONA client. Shutting down.`);
        }
      } else {
        this.log.error(
          `Received code ${code} from ICONA client during authentication phase. Shutting down.`
        );
      }
      await client.shutdown();
    };
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }
}
