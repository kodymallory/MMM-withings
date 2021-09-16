const NodeHelper = require("node_helper");
const path = require("path");
const fs = require("fs");
const Https = require('https');
const open = require('open');
const filename = "/tokens.json";
var tokenFilename = path.resolve(__dirname + filename);
const KG_TO_LBS = 2.2046;

// Default OAUTH2.0 values from Withings Documentation
const CLIENT_ID = "7573fd4a4c421ddd102dac406dc6e0e0e22f683c4a5e81ff0a5caf8b65abed67";
const CLIENT_API_K = "d9286311451fc6ed71b372a075c58c5058be158f56a77865e43ab3783255424f";
const REDIRECT_URI = `https://www.withings.com`;

const metricToImperialMap = {
  'kg': 'lbs',
  'celcius': 'farenheight',
  'percent': 'percent',
  'meter': 'inches',
  'mmHg': 'mmHg',
  'm/s': 'm/s'
}
const measTypeMap = {
  '1':'weight',
  '4':'height',
  '5':'fatFreeMass',
  '6':'fatRatio',
  '8':'fatMassWeight',
  '9':'diastolicBloodPressure',
  '10':'systolicBloodPressure',
  '11':'heartPulse',
  '12':'temperature',
  '54':'sp02',
  '71':'bodyTemperature',
  '73':'skinTemperature',
  '76':'muscleMass',
  '77':'hydration',
  '88':'boneMass',
  '91':'pulseWaveVelocity'
};

const measInfo = {
  'weight': {
    'index': '1',
    'si_unit':'kg'
  },
  'height': {
    'index': '4',
    'si_unit':'meter'
  },
  'fatFreeMass': {
    'index': '5',
    'si_unit': 'kg'
  },
  'fatRatio': {
    'index': '6',
    'si_unit': 'percent'
  },
  'fatMassWeight': {
    'index': '8',
    'si_unit': 'kg'
  },
  'diastolicBloodPressure': {
    'index': '9',
    'si_unit': 'mmHg'
  },
  'systolicBloodPressure': {
    'index': '10',
    'si_unit': 'mmHg'
  },
  'heartPulse': {
    'index': '11',
    'si_unit': 'bpm'
  },
  'temperature': {
    'index': '12',
    'si_unit': 'celcius'
  },
  'sp02': {
    'index': 'percent',
    'si_unit': 'celcius'
  },
  'bodyTemperature': {
    'index': '71',
    'si_unit': 'celcius'
  },
  'skinTemperature': {
    'index': '73',
    'si_unit': 'celcius'
  },
  'muscleMass': {
    'index': '76',
    'si_unit': 'kg'
  },
  'hydration': {
    'index': '77',
    'si_unit': 'percent'
  },
  'boneMass': {
    'index': '88',
    'si_unit': 'kg'
  },
  'pulseWaveVelocity': {
    'index': '91',
    'si_unit': 'm/s'
  }
};

module.exports = NodeHelper.create({
  start: function () {
    var self = this;
    console.log("##### Starting node helper for: " + self.name);

    self.baseApi = 'wbsapi.withings.net';
    self.tokenPath = '/v2/oauth2';
    self.authorizationUri = 'account.withings.com/oauth2_user/authorize2';
    self.scopes = ['user.info', 'user.metrics', 'user.activity'];

    self.clientId = CLIENT_ID;
    self.clientSecret = CLIENT_API_K;
    self.redirectUri = REDIRECT_URI;

    console.info("**** Setting the tokens from File: " + tokenFilename);
  },

  convertData: function (meas) {
    var self = this;
    var value = meas.value * Math.pow(10, meas.unit);
    if (self.units == 'imperial')
    {
      switch(measInfo[measTypeMap[meas.type]].si_unit) {
        case 'kg':
          value *= KG_TO_LBS;
          break;
        case 'percent':
        default:
          break;
      }
    }
    return value;
  },

  getMeasurementUnit: function (meas) {
    var self = this;
    var unit = measInfo[measTypeMap[meas.type]].si_unit;
    if (self.units == 'imperial')
    {
      unit = metricToImperialMap[unit];
    }
    return unit;
  },

  getAccessToken: function (code) {
    var self = this;
    console.info("Generating Access tokens...");
    var options = {
      hostname: self.baseApi,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      path: self.tokenPath,
      method: 'POST'
    };
    var request = Https.request(options, function (response) {
      var data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        var reply = JSON.parse(data);
        console.info("Reply from access token:", reply);
        switch (reply.status) {
          case 0:
            console.info("#### Got Tokens");
            self.access_token = reply.body.access_token;
            self.refresh_token = reply.body.refresh_token;
            this.updateTokenFile(self.access_token, self.refresh_token);
            this.sendSocketNotification("API_INITIALIZED");
            break;
          default:
            //Fetching tokens error
            console.info("Error while getting access_token: ", reply.status);
            self.access_token = null;
            self.refresh_token = null;
            setTimeout(function () {
              self.initializeApi();
            }, 1000);
            break;
        }
      }.bind(self));
    }.bind(self));
    params = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: self.clientId,
      client_secret: self.clientSecret,
      code: code,
      redirect_uri: self.redirectUri});
    request.write(params.toString());

    request.on('error', function (error) {
      console.error(error + " Re-requesting authorization! - AGAIN !!");
    }.bind(self));
    request.end();
  },

  getMeasurement: function (updateRequest) {
    var self = this;
    var measTypes = updateRequest.measTypes;

    console.info("Fetching Weight for the past " + updateRequest.daysOfHistory + " days");
    var date = new Date();
    // TODO: Replace with variable offset
    date.setDate(date.getDate() - updateRequest.daysOfHistory);
    var updateTimestamp = Math.floor(date.getTime() / 1000);
    var params = new URLSearchParams({
      action:'getmeas',
      access_token: self.access_token,
      meastype: measTypes.map(function (type) { return measInfo[type].index}),
      category: '1',
      lastupdate: updateTimestamp
    });

    var options = {
      hostname: self.baseApi,
      path: '/measure?' + params.toString(),
      method: 'GET'
    };

    var request = Https.request(options, function (response) {
      var data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        var reply = JSON.parse(data);
        switch (reply.status) {
          case 0:
            console.info("Got Data Back");
            var measurements = reply.body.measuregrps;
            var measurementData = [];
            measurements.forEach(function (measure){
              var date = new Date(measure.date * 1000);
              measure.measures.forEach(function (meas) {
                measurementData.push({
                  'type': measTypeMap[meas.type],
                  'measurement': self.convertData(meas),
                  'date': date,
                  'unit': self.getMeasurementUnit(meas)
                });
              });
            });
            // send Data To Display Module
            this.sendSocketNotification("DATA_UPDATE", measurementData);
            break;
          case 401:
            console.info("Token Expired");
            self.refreshToken();
            break;
          default:
            console.error("Something Went Wrong ", reply);
            break;
        }
      }.bind(self));
    }.bind(self));
    request.on('error', function (error) {
      console.error("An error occured", error);
      setTimeout(self.update.bind(self), 1000);
    }.bind(self));
    request.end();
  },

  initializeApi: function(config) {
    var self = this;

    if (config) {
      console.log("Initializing API with config", config);
      if (config.clientId) {
        self.clientId = config.clientId;
      }
      if (config.clientSecret) {
        self.clientSecret = config.clientSecret;
      }
      if (config.redirectUri) {
        self.redirectUri = config.redirectUri;
      }
      self.units = config.units;
    }

    try {
      fs.readFile(tokenFilename, function read(err, data) {
        if (err) {
          if (err.code === "ENOENT") {
            console.log(`Could not find tokens file: ${tokenFilename}`);
            return;
          }
          else {
            console.error(err);
            return;
          }
        }

        var parsedData = JSON.parse(data);
        if (parsedData.access_token && parsedData.refresh_token) {
          self.access_token = parsedData.access_token;
          self.refresh_token = parsedData.refresh_token;
          console.info("Access Token " + self.access_token);
          console.info("Refresh Token " + self.refresh_token);
          self.sendSocketNotification("API_INITIALIZED");
        }
        else {
          console.info("No Access Token Found, Trying code...");
          code = parsedData.code;

          console.log("Code is ", code);
          self.getAccessToken(code);
        }
      });
    } catch (err) {
      console.error("Recieved Error: ", err, " stack:", err.stack);
    }
  },

  socketNotificationReceived: function (notification, payload) {
    var self = this;
    switch(notification) {
      case "INITIALIZE_API":
        self.initializeApi(payload);
        break;
      case "UPDATE_DATA":
        self.getMeasurement(payload);
        break;
      default:
        console.error("Unhandled Notification ", notification);
        break;
    }
  },

  refreshToken: function () {
    var self = this;
    console.info("Refreshing tokens...");
    var options = {
      hostname: self.baseApi,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      path: self.tokenPath,
      method: 'POST'
    };
    var request = Https.request(options, function (response) {
      var data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        var reply = JSON.parse(data);

        switch (reply.status) {
          case 0:
            console.info("#### Got Refresh Tokens");
            self.access_token = reply.body.access_token;
            self.refresh_token = reply.body.refresh_token;
            this.updateTokenFile(self.access_token, self.refresh_token);
            break;
          default:
            //Refreshing error
            console.info("Error while refreshing tokens: ", reply.status);
            self.access_token = null;
            self.refresh_token = null;
            break;
        }
      }.bind(self));
    }.bind(self));

    params = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      refresh_token: self.refresh_token,
      client_id: self.clientId,
      client_secret: self.clientSecret});
    request.write(params.toString());

    request.on('error', function (error) {
      console.error("Request Error while refreshing tokens: ", error);
    }.bind(self));
    request.end();
  },

  updateTokenFile: function (accessToken, refreshToken) {
    // Write the new codes to file
    var obj = { access_token: accessToken, refresh_token: refreshToken };
    var toWriteKeys = JSON.stringify(obj);
    fs.writeFile(tokenFilename, toWriteKeys, function (err) {
      if (err) throw err;
      console.log('Saved tokens!');
    });
  },
});