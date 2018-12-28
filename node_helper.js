const NodeHelper = require("node_helper");
const path = require("path");
const fs = require("fs");
const Https = require('https');
const Querystring = require('querystring');
const filename = "/tokens.json";
var configFilename = path.resolve(__dirname + filename);
const KG_TO_POUNDS = 2.2046;

module.exports = NodeHelper.create({
  start: function () {
    var self = this;
    console.log("##### Starting node helper for: " + self.name);

    self.baseApi = 'account.health.nokia.com';
    self.measurementApi = 'wbsapi.withings.net';
    self.tokenPath = '/oauth2/token';
    self.authorizationUri = self.baseApi + '/oauth2_user/authorize2';
    self.scopes = ['user.info', 'user.metrics', 'user.activity'];

    console.info("**** Setting the tokens from File: " + configFilename);
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
        console.info(reply);
        switch (reply['errors'] || null) {
          case null:
            console.info("#### Got Tokens");
            self.access_token = reply['access_token'];
            self.refresh_token = reply['refresh_token'];
            this.updateTokenFile(self.access_token, self.refresh_token);
            this.sendSocketNotification("API_INITIALIZED");
            break;
          default:
            //Fetching tokens error
            console.info(reply.errors);
            self.access_token = null;
            self.refresh_token = null;
            setTimeout(function () {
              self.initializeApi();
            }, 1000);
            break;
        }
      }.bind(self));
    }.bind(self));
    request.write(Querystring.stringify({
      'grant_type': 'authorization_code',
      'code': code,
      'client_id': self.clientId,
      'client_secret': self.clientSecret,
      'redirect_uri': self.redirectUri
    }));
    request.on('error', function (error) {
      console.error(error + " Re-requesting authorization! - AGAIN !!");
    }.bind(self));
    request.end();
  },

  getWeightData: function (updateRequest) {
    var self = this;
    console.info("Fetching Weight for the past " + updateRequest.daysOfHistory + " days");
    var date = new Date();
    // TODO: Replace with variable offset
    date.setDate(date.getDate() - updateRequest.daysOfHistory);
    var updateTimestamp = Math.floor(date.getTime() / 1000);
    var options = {
      hostname: self.measurementApi,
      path: '/measure?' + Querystring.stringify({
        'action':'getmeas',
        'access_token': self.access_token,
        'meastype': '1',
        'category': '1',
        'lastupdate': updateTimestamp
      }),
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
            var weightDataLb = [];
            measurements.forEach(function (meas){
              var date = new Date(meas.date * 1000);

              weightDataLb.push({
                'weight': meas.measures[0].value * Math.pow(10, meas.measures[0].unit) * KG_TO_POUNDS,
                'date': date
              });
            });
            // send Data To Display Module
            this.sendSocketNotification("WEIGHT_DATA_UPDATE", weightDataLb);
            break;
          case 401:
            console.info("Token Expired");
            self.refresh();
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
      self.clientId = config.clientId;
      self.clientSecret = config.clientSecret;
      self.redirectUri = config.redirectUri;
    }

    fs.readFile(configFilename, function read(err, data) {
      if (err) throw err;
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
  },

  socketNotificationReceived: function (notification, payload) {
    var self = this;
    switch(notification) {
      case "INITIALIZE_API":
        self.initializeApi(payload);
        break;
      case "UPDATE_DATA":
        self.getWeightData(payload);
        break;
      default:
        console.error("Unhandled Notification ", notification);
        break;
    }
  },

  refresh: function () {
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
        console.info(reply);
        switch (reply['errors'] || null) {
          case null:
            console.info("#### Refresh Tokens");
            self.access_token = reply['access_token'];
            self.refresh_token = reply['refresh_token'];
            this.updateTokenFile(self.access_token, self.refresh_token);
            break;
          default:
            //Refreshing error
            console.info(reply.errors);
            self.access_token = null;
            self.refresh_token = null;
            break;
        }
      }.bind(self));
    }.bind(self));

    request.write(Querystring.stringify({
      'grant_type': 'refresh_token',
      'refresh_token': self.refresh_token,
      'client_id': self.clientId,
      'client_secret': self.clientSecret,
      'redirect_uri': self.redirectUri
    }));

    request.on('error', function (error) {
      console.error(error + " Re-requesting authorization! - AGAIN !!");
    }.bind(self));
    request.end();
  },

  updateTokenFile: function (accessToken, refreshToken) {
    // Write the new codes to file
    var obj = { access_token: accessToken, refresh_token: refreshToken };
    var toWriteKeys = JSON.stringify(obj);
    fs.writeFile(configFilename, toWriteKeys, function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  },
});