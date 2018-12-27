Module.register("MMM-withings",{

  // Default module config.
  defaults: {
    displayWeightGraph: true,
    graphWidth: 400,
    initialLoadDelay: 0, // 0 seconds delay
    updateInterval: 5 * 60 * 1000, // every 5 minutes
    daysOfHistory: 14 // Show history of 2 weeks of weight
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    this.userName = 'Magic Mirror';

    this.scheduleUpdate(this.config.initialLoadDelay);
  },

  getScripts: function () {
    return ["Chart.bundle.min.js"]
  },

  getDom: function() {
    var wrapper = document.createElement("div");

    var summary = document.createElement("div");
    summary.innerHTML = "Health Data For " + this.userName;
    summary.className = "dimmed light small";
    wrapper.appendChild(summary);

    if (this.config.displayWeightGraph) {
      wrapper.appendChild(this.renderWeightGraph());
    }

    return wrapper;
  },

  processData: function () {
    var self = this;
    self.scheduleUpdate();
  },

  renderWeightGraph: function () {
    var i;
    var width = this.config.graphWidth;
    var height = Math.round(width * 0.3);
    var element = document.createElement('canvas');
    element.className = "weight-graph";
    element.width  = width;
    element.height = height;
    var ctx = element.getContext('2d');

    var myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.weightData.dates,
        datasets: [{
          data: this.weightData.weights,
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
    if (notification === "WEIGHT_DATA_UPDATE") {
      Log.info("Received Data ", payload);
      self.weightData = {
        'weights': [],
        'dates': []
      };
      payload.forEach(function(meas) {
        self.weightData.weights.push(meas.weight);
        self.weightData.dates.push(meas.date);
      });
      this.updateDom();
    }
  },

  update: function () {
    var self = this;
    Log.info("Update Called");
    var updateRequest = {
      'daysOfHistory': self.config.daysOfHistory
    }
    this.sendSocketNotification("UPDATE_DATA", updateRequest);
    self.scheduleUpdate();
  },
});
