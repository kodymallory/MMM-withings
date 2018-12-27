const NodeHelper = require("node_helper");
const path = require("path");
const fs = require("fs");
const Https = require('https');
const Querystring = require('querystring');
const filename = "/tokens.json";
var configFilename = path.resolve(__dirname + filename);
const GRAMS_TO_POUNDS = 0.0022046;

module.exports = NodeHelper.create({
  start: function () {
    var self = this;
    console.log("##### Starting node helper for: " + self.name);

    self.clientId = 'd8973ddc0d93a3b646724a04adddca246ef5c0a9018f963724125bd4747a972a';
    self.clientSecret = '56b1d32e8ae199aabcda5fece5b982e89a8a6472f46ce035d230cfd28ba564d4';
    self.baseApi = 'account.health.nokia.com';
    self.measurementApi = 'wbsapi.withings.net';
    self.tokenPath = '/oauth2/token';
    self.authorizationUri = self.baseApi + '/oauth2_user/authorize2';
    self.redirectUri = 'http://kodymallory.epizy.com';
    self.scopes = ['user.info', 'user.metrics', 'user.activity'];

    console.info("**** Setting the tokens from File: " + configFilename);
    fs.readFile(configFilename, function read(err, data) {
      if (err) throw err;
      var parsedData = JSON.parse(data);
      self.access_token = parsedData.access_token;
      self.refresh_token = parsedData.refresh_token;

      console.info("Access Token "+self.access_token);
      console.info("Refresh Token "+self.refresh_token);
    });
  },

  getWeightData: function () {
    var self = this;
    console.info("Fetching Weight...");
    var date = new Date();
    // TODO: Replace with variable offset
    date.setDate(date.getDate() - 7);
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
              weightDataLb.push(meas.measures[0].value * GRAMS_TO_POUNDS);
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

  socketNotificationReceived: function (notification, payload) {
    var self = this;

    if (notification === "UPDATE_DATA") {
      console.info("UPDATE_DATA Received");
      self.getWeightData();
    };
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
        switch (reply['error'] || null) {
          case null:
            console.info("#### Tokens");
            self.access_token = reply['access_token'];
            self.refresh_token = reply['refresh_token'];
            this.updateTokenFile(self.access_token, self.refresh_token);
            break;
          default:
            //Refreshing error
            console.info(reply['error_description'] + " Re-requesting authorization!");
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