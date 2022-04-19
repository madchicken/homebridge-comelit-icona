![Homebridge](https://github.com/madchicken/homebridge-comelit-hub/raw/master/images/homebridge.png)

# Comelit HUB integration for Homebridge

![Comelit](https://github.com/madchicken/homebridge-comelit-hub/raw/master/images/comelit.png)

## Description

This is a Homebridge platform plugin to expose Comelit ICONA features to HK.
The code is based on the reverse engineering of the official protocol, so expect bugs.
The plugin currently supports only listing and opening connected doors/gates.

## Installation

1. Install [homebridge](https://github.com/nfarina/homebridge#installation-details)
2. Install this plugin: `npm install -g homebridge-comelit-icona`
3. Update your `config.json` file

## Configuration examples

You can setup the plugin by using the builtin Homebridge WEB UI tool. You need at least to provide:

- bridge_url: URL of the ICONA Bridge server
- bridge_port: TCP port of the ICONA Bridge server (optional, default is 64100)
- icona_token: Authentication token used to communicate with the bridge

Here is a sample config for the plugin:

```json
{
  "platform": "Icona",
  "name": "Icona",
  "bridge_url": "192.168.1.100",
  "icona_token": "yoursuperrsecrettoken"
}
```

The plugin will automatically fetch the configuration on startup and configuring for you all the gates/doors you have mapped
in the system. By default, they will be mounted as `temporized gate` with a default configuration:

```json
{
  "type": "temporized_gate",
  "opening_time": 20,
  "closing_time": 20,
  "opened_time": 60
}
```

You can override these settings by adding a `devices` section in the config.json file (you can use the WEB UI if you prefer).
You can choose between `simple_gate` and `temporized_gate`: the former is a door that will reset its state after a period
of `opened_time` seconds. The latter is an automatic gate that opens in `opening_time` seconds, stay opened for `opened_time`
seconds and then closes in `closing_time` seconds. Usually `opening_time` and `closing_time` are equals.

Simple gate example:

```json
{
  "platform": "Icona",
  "name": "Icona",
  "bridge_url": "192.168.1.100",
  "icona_token": "yoursuperrsecrettoken",
  "devices": [
    {
      "name": "NAME_OF_THE_DOOR",
      "type": "simple_gate",
      "opened_time": 120
    }
  ]
}
```

Temporized gate example:

```json
{
  "platform": "Icona",
  "name": "Icona",
  "bridge_url": "192.168.1.100",
  "icona_token": "yoursuperrsecrettoken",
  "devices": [
    {
      "name": "NAME_OF_THE_DOOR",
      "type": "temporized_gate",
      "opening_time": 30,
      "closing_time": 30,
      "opened_time": 120
    }
  ]
}
```
