// Philips Hue Platform Shim for HomeBridge
//
// Remember to add platform to config.json. Example:
// "platforms": [
//     {
//         "platform": "PhilipsHue",
//         "name": "Philips Hue",
//         "ip_address": "127.0.0.1",
//         "username": "252deadbeef0bf3f34c7ecb810e832f"
//     }
// ],
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.
//

/* jslint node: true */
/* globals require: false */
/* globals config: false */

"use strict";

var hue = require("node-hue-api"),
    HueApi = hue.HueApi,
    lightState = hue.lightState;

var types = require("../lib/HAP-NodeJS/accessories/types.js");

function PhilipsHuePlatform(log, config) {
  this.log     = log;
  this.ip_address  = config["ip_address"];
  this.username    = config["username"];
}

function PhilipsHueAccessory(log, device, api) {
  this.id = device.id;
  this.name = device.name;
  this.model = device.modelid;
  this.device = device;
  this.api = api;
  this.log = log;
}

// Execute changes for various characteristics
var execute = function(api, device, characteristic, value) {

  var state = lightState.create();

  characteristic = characteristic.toLowerCase();
  if (characteristic === "identify") {
    state.alert('select');
  }
  else if (characteristic === "on") {
    state.on();
  }
  else if (characteristic === "hue") {
    state.hue(value);
  }
  else if (characteristic === "brightness") {
    value = value/100;
    value = value*255;
    value = Math.round(value);
    state.bri(value);
  }
  else if (characteristic === "saturation") {
    value = value/100;
    value = value*255;
    value = Math.round(value);
    state.sat(value);
  }
  api.setLightState(device.id, state, function(err, lights) {
    if (!err) {
      console.log("executed accessory: " + device.name + ", and characteristic: " + characteristic + ", with value: " +  value + ".");
    }
    else {
      console.log(err);
    }
  });
};

PhilipsHuePlatform.prototype = {
  accessories: function(callback) {
    this.log("Fetching Philips Hue lights...");

    var that = this;
    var foundAccessories = [];

    var api = new HueApi(this.ip_address, this.username);

    // Connect to the API and loop through lights
    api.lights(function(err, response) {
      if (err) throw err;
      response.lights.map(function(device) {
        var accessory = new PhilipsHueAccessory(that.log, device, api);
        foundAccessories.push(accessory);
      });
      callback(foundAccessories);
    });
  }
};

PhilipsHueAccessory.prototype = {
  // Set Power State
  setPowerState: function(powerOn) {
    if (!this.device) {
      this.log("No '"+this.name+"' device found (yet?)");
      return;
    }

    var that = this;
    var state;

    if (powerOn) {
      this.log("Setting power state on the '"+this.name+"' to off");
      state = lightState.create().on();
      that.api.setLightState(that.id, state, function(err, result) {
        if (err) {
          that.log("Error setting power state on for '"+that.name+"'");
        }
        else {
          that.log("Successfully set power state on for '"+that.name+"'");
        }
      });
    }
    else {
      this.log("Setting power state on the '"+this.name+"' to off");
      state = lightState.create().off();
      that.api.setLightState(that.id, state, function(err, result) {
        if (err) {
          that.log("Error setting power state off for '"+that.name+"'");
        }
        else {
          that.log("Successfully set power state off for '"+that.name+"'");
        }
      });
    }
  },
  // Set Brightness
  setBrightness: function(level) {
    if (!this.device) {
      this.log("No '"+this.name+"' device found (yet?)");
      return;
    }

    var that = this;
    var state;

    this.log("Setting brightness on the '"+this.name+"' to " + level);
    state = lightState.create().brightness(level);
    that.api.setLightState(that.id, state, function(err, result) {
      if (err) {
        that.log("Error setting brightness for '"+that.name+"'");
      }
      else {
        that.log("Successfully set brightness for '"+that.name+"'");
      }
    });
  },
  // Get Services
  getServices: function() {
    var that = this;
    return [{
      sType: types.ACCESSORY_INFORMATION_STYPE,
      characteristics: [{
        cType: types.NAME_CTYPE,
        onUpdate: null,
        perms: ["pr"],
      format: "string",
      initialValue: this.name,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Name of the accessory",
      designedMaxLength: 255
      },{
        cType: types.MANUFACTURER_CTYPE,
        onUpdate: null,
        perms: ["pr"],
      format: "string",
      initialValue: "Philips",
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Manufacturer",
      designedMaxLength: 255
      },{
        cType: types.MODEL_CTYPE,
        onUpdate: null,
        perms: ["pr"],
      format: "string",
      initialValue: this.model,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Model",
      designedMaxLength: 255
      },{
        cType: types.IDENTIFY_CTYPE,
        onUpdate: function(value) { console.log("Change:",value); execute(this.device, this.id, "identify", value); },
        perms: ["pw"],
      format: "bool",
      initialValue: false,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Identify Accessory",
      designedMaxLength: 1
      }]
    },{
      sType: types.LIGHTBULB_STYPE,
      characteristics: [{
        cType: types.NAME_CTYPE,
        onUpdate: null,
        perms: ["pr"],
      format: "string",
      initialValue: this.name,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Name of service",
      designedMaxLength: 255
      },{
        cType: types.POWER_STATE_CTYPE,
        onUpdate: function(value) { console.log("Change:",value); execute(this.api, this.device, "on", value); },
        perms: ["pw","pr","ev"],
      format: "bool",
      initialValue: false,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Turn On the Light",
      designedMaxLength: 1
      },{
        cType: types.HUE_CTYPE,
        onUpdate: function(value) { console.log("Change:",value); execute(this.api, this.device, "hue", value); },
        perms: ["pw","pr","ev"],
      format: "int",
      initialValue: 0,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Adjust Hue of Light",
      designedMinValue: 0,
      designedMaxValue: 65535,
      designedMinStep: 1,
      unit: "arcdegrees"
      },{
        cType: types.BRIGHTNESS_CTYPE,
        onUpdate: function(value) { console.log("Change:",value); execute(this.api, this.device, "brightness", value); },
        perms: ["pw","pr","ev"],
      format: "int",
      initialValue: 0,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Adjust Brightness of Light",
      designedMinValue: 0,
      designedMaxValue: 100,
      designedMinStep: 1,
      unit: "%"
      },{
        cType: types.SATURATION_CTYPE,
        onUpdate: function(value) { console.log("Change:",value); execute(this.api, this.device, "saturation", value); },
        perms: ["pw","pr","ev"],
      format: "int",
      initialValue: 0,
      supportEvents: false,
      supportBonjour: false,
      manfDescription: "Adjust Saturation of Light",
      designedMinValue: 0,
      designedMaxValue: 100,
      designedMinStep: 1,
      unit: "%"
      }]
    }];
  }
};

module.exports.platform = PhilipsHuePlatform;