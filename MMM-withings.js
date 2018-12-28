Module.register("MMM-withings",{

  // Default module config.
  defaults: {
    units: config.units,
    userName: 'MagicMirror',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    initialLoadDelay: 0, // 0 seconds delay
    updateInterval: 5 * 60 * 1000, // every 5 minutes
    daysOfHistory: 14, // Show history of 2 weeks of weight
    measurements: ['weight'] // Display weight by default
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    this.userName = 'Magic Mirror';
    this.measurementData = {};

    this.sendSocketNotification("INITIALIZE_API", this.config);
  },

  getScripts: function () {
    return ["Chart.bundle.min.js"]
  },

  getDom: function() {
    var self = this;
    var wrapper = document.createElement("div");

    var summary = document.createElement("div");
    summary.innerHTML = "Health Data For " + this.config.userName;
    summary.className = "dimmed light small";
    wrapper.appendChild(summary);

    self.config.measurements.forEach(function (meas) {
      if (typeof self.measurementData[meas] != 'undefined') {
        wrapper.appendChild(self.renderMeasurementGraph(meas));
      }
    });

    return wrapper;
  },

  processData: function () {
    var self = this;
    self.scheduleUpdate();
  },

  renderMeasurementGraph: function (measType) {
    var element = document.createElement('canvas');
    element.className = measType + "-graph";
    var ctx = element.getContext('2d');

    var myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.measurementData[measType].dates,
        datasets: [{
          data: this.measurementData[measType].data,
          borderColor:'white',
          borderWidth: 1
        }]
      },
      options: {
        legend: {
          display: false
        },
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: measType + ' (' + this.measurementData[measType].unit + ')'
            },
            ticks: {
              beginAtZero: false
            }
          }],
          xAxes: [{
            type: 'time',
            time: {
              unit: 'day'
            }
          }]
        }
      }
    });
    return element;
  },

  scheduleUpdate: function(delay) {
    var nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    var self = this;
    setTimeout(function() {
      self.update();
    }, nextLoad);
  },

  socketNotificationReceived: function (notification, payload) {
    self = this;
    switch(notification) {
      case "DATA_UPDATE":
        Log.info(payload);
        self.measurementData = {};
        payload.forEach(function (meas) {
          if (typeof self.measurementData[meas.type] == "undefined") {
            self.measurementData[meas.type] = {
              'data': [],
              'dates': [],
              'unit': ''
            }
          }
          self.measurementData[meas.type].data.push(meas.measurement);
          self.measurementData[meas.type].dates.push(meas.date);
          self.measurementData[meas.type].unit = meas.unit;
        });
        this.updateDom();
        break;
      case "API_INITIALIZED":
        this.scheduleUpdate(this.config.initialLoadDelay);
        break;
      default:
        break;
    }
  },

  update: function () {
    var self = this;
    var updateRequest = {
      'daysOfHistory': self.config.daysOfHistory,
      'measTypes': self.config.measurements
    }
    this.sendSocketNotification("UPDATE_DATA", updateRequest);
    self.scheduleUpdate();
  },
});
