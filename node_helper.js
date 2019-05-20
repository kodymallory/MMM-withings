const NodeHelper = require("node_helper");
const path = require("path");
const fs = require("fs");
const Https = require('https');
const Querystring = require('querystring');
const filename = "/tokens.json";
var configFilename = path.resolve(__dirname + filename);
const KG_TO_LBS = 2.2046;

//const rawdata = fs.readFileSync('/maps/workouts.json');
var workoutMap = '';
fs.readFile(path.resolve(__dirname + '/maps/workouts.json'), (err, data) => {
  if (err) throw err;
  workoutMap = JSON.parse(data);
});
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
}

function rawDuration(serie){
  var date1 = new Date(serie.enddate*1000);
  var date2 = new Date(serie.startdate*1000);
  return (date1.getTime() - date2.getTime())/1000/60; // Duration in minutes
};

function workoutDuration(serie){
  var date1 = new Date(serie.enddate*1000);
  var date2 = new Date(serie.startdate*1000);
  var difference = date1.getTime() - date2.getTime();

  var duration = "";

  var daysDifference = Math.floor(difference/1000/60/60/24);
  difference -= daysDifference*1000*60*60*24

  duration = daysDifference<1 ? "" : daysDifference+"d";

  // var days =
  var hoursDifference = Math.floor(difference/1000/60/60);
  difference -= hoursDifference*1000*60*60
  duration = duration + (hoursDifference<1 ? "" : hoursDifference+":");

  var minutesDifference = Math.floor(difference/1000/60);
  difference -= minutesDifference*1000*60
  duration = duration + (minutesDifference<1 ? "" : minutesDifference);

  // var secondsDifference = Math.floor(difference/1000);
  // duration = duration + (secondsDifference<1 ? "" : secondsDifference+"s");

  return duration;
};


module.exports = NodeHelper.create({
  start: function () {
    var self = this;
    console.log("##### Starting node helper for: " + self.name);

    self.baseApi = 'account.health.nokia.com';
    self.withingsApi = 'wbsapi.withings.net';
    self.tokenPath = '/oauth2/token';
    self.authorizationUri = self.baseApi + '/oauth2_user/authorize2';
    self.scopes = ['user.info', 'user.metrics', 'user.activity'];

    console.info("**** Setting the tokens from File: " + configFilename);
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

  getRequest: function(service, action, updateRequest) {
    //service is in ["measure", "sleep", "notify"]
    var self = this;
    // Default pathPrefix
    var pathPrefix = '/v2/'+service+"?";

    // Change the pathPrefix if needed
    if (service=="measure"){
      if (action=="getmeas"){
        pathPrefix = "/measure?";
      }
    } else if(service=="notify"){
      pathPrefix = "/measure?";
    }

    console.info("Fetching data");
    console.info("service: "+service+" action: "+action);

    var date = new Date();
    // TODO: Replace with variable offset
    date.setDate(date.getDate() - updateRequest.daysOfHistory);
    var updateTimestamp = Math.floor(date.getTime() / 1000);

    // Set default variables in request
    var options = {
      hostname: self.withingsApi,
      path: pathPrefix + Querystring.stringify({
        'action': action,
        'access_token': self.access_token
      }),
      method: 'GET'
    };


    if (action=='getmeas'){
      var measTypes = updateRequest.measTypes;
      options['path'] = options['path'] + "&"+Querystring.stringify({
          'meastype': measTypes.map(function (type) { return measInfo[type].index}),
          'category': '1',
          'lastupdate': updateTimestamp
        });
    }else if (action=='getworkouts'){
      var now = new Date();
      var startDate = new Date();
      startDate.setDate(now.getDate() - updateRequest.daysOfHistory);
      var enddateymd = now.toJSON().slice(0,10);// https://stackoverflow.com/a/19079030
      var startdateymd = startDate.toJSON().slice(0,10);// https://stackoverflow.com/a/19079030

      var updateTimestamp = Math.floor(date.getTime() / 1000);
      var workouts = updateRequest.workouts;
      var workoutLimitPerDay = updateRequest.workoutLimitPerDay;
      // options['path'] = options['path'] + "&lastupdate="+updateTimestamp;
      options['path'] = options['path'] + "&"+Querystring.stringify({
          'startdateymd': startdateymd,
          'enddateymd': enddateymd
        });
    }
    console.info("Fetching Weight for the past " + updateRequest.daysOfHistory + " days");

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

            if (action=='getmeas'){
              var measurements = reply.body.measuregrps;
              var measurementData = [];
              measurements.forEach(function (measure){
                var date = new Date(measure.date * 1000);
                measure.measures.forEach(function (meas) {
                  measurementData.push({
                    'type': measTypeMap[meas.type],
                    'measurement': self.convertData(meas),
                    'date': date,
                    'unit': metricToImperialMap[measInfo[measTypeMap[meas.type]].si_unit]
                  });
                });
              });
              // send Data To Display Module
              this.sendSocketNotification("DATA_UPDATE", measurementData);
            }
            else if(action=="getworkouts")
            {
              var series = reply.body.series;
              // Reverse the order of the keys: younger activity to older one
              var seriesKeys = Object.keys(series).reverse();
              var Data = [[],{}]; // Data[0] stores dates and Data[1] stores the workout
              var workout = '';
              var icon = "";
              var workoutCount = {};


              var previousDate = series[seriesKeys[0]].date;
              Data[0]=[previousDate];
              Data[1][previousDate]=[];

              seriesKeys.forEach(function(idx){
                let serie = series[idx];
                if (serie.date!=previousDate){
                  workoutCount = {};
                  previousDate = serie.date;
                  if (!Data[0].includes(serie.date)){
                    Data[0].push(serie.date);
                    Data[1][serie.date]=[];
                  }
                }


                workout = workoutMap[serie.category];
                if (workouts.includes(workout)){
                  if (typeof workoutCount[workout]=="undefined"){
                    workoutCount[workout] = 1;
                  }
                  if (workoutCount[workout]<=workoutLimitPerDay){
                    if (rawDuration(serie)>=updateRequest.workoutDurationMin){
                      Data[1][serie.date].push({
                        "category": workout,
                        "startdate": serie.startdate,
                        "enddate": serie.enddate,
                        "duration": workoutDuration(serie),
                        "calories": serie.data.calories,
                        "steps": serie.data.steps
                      });
                      workoutCount[workout]++;
                    }
                  }
                }

              });
              // send Data To Display Module
              this.sendSocketNotification("WORKOUT_UPDATE", Data);
            }
            this.sendSocketNotification("UPDATE_DOM", {});
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
      self.units = config.units;
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
        self.getRequest("measure", "getmeas", payload);
        self.getRequest("measure", "getworkouts", payload);
        break;
      case "UPDATE_WORKOUTS":
        //self.getRequest("measure", "getworkouts", payload);
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