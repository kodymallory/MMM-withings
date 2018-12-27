const NodeHelper = require("node_helper");
const path = require("path");
const fs = require("fs");
const Https = require('https');
const Querystring = require('querystring');
const filename = "/tokens.json";
var configFilename = path.resolve(__dirname + filename);

module.exports = NodeHelper.create({
  start: function () {
    var self = this;
    console.log("##### Starting node helper for: " + self.name);

    self.clientId = 'd8973ddc0d93a3b646724a04adddca246ef5c0a9018f963724125bd4747a972a';
    self.clientSecret = '56b1d32e8ae199aabcda5fece5b982e89a8a6472f46ce035d230cfd28ba564d4';
    self.baseApi = 'account.health.nokia.com';
    self.tokenPath = '/oauth2/token';
    self.tokenApi = self.baseApi + self.tokenPath;
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
      self.refresh();
    });
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
            access_token = reply['access_token'];
            refresh_token = reply['refresh_token'];
            this.updateTokenFile(access_token, refresh_token);
            break;
          default:
            //Refreshing error, so we need a new PIN authorization
            console.info(reply['error_description'] + " Re-requesting authorization!");
            access_token = null;
            refresh_token = null;
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