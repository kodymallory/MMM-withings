Module.register("MMM-withings",{

  // Default module config.
  defaults: {
    text: "Hello World!",
    apiKey: "",
    showWeightGraph: true,
    graphWidth: 400,
    initialLoadDelay: 0, // 0 seconds delay
    updateInterval: 5 * 60 * 1000 // every 5 minutes
  },

  getDom: function() {
    var wrapper = document.createElement("div");

    var summary = document.createElement("div");
    summary.innerHTML = "Hello World from Withings";
    summary.className = "dimmed light small";
    wrapper.appendChild(summary);

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
    var context = element.getContext('2d');

    var sixth = Math.round(width / 6);
    context.save();
    context.strokeStyle = 'gray';
    context.lineWidth = 2;
    for (i = 1; i < 6; i++) {
      context.moveTo(i * sixth, height);
      context.lineTo(i * sixth, height - 10);
      context.stroke();
    }
    context.restore();

    var third = Math.round(height / 3);
    context.save();
    context.strokeStyle = 'gray';
    context.setLineDash([5, 15]);
    context.lineWidth = 1;
    for (i = 1; i < 3; i++) {
      context.moveTo(0, i * third);
      context.lineTo(width, i * third);
      context.stroke();
    }
    context.restore();

    context.lineTo(width, height);
    context.closePath();
    context.fill();
    context.restore();

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
      this.updateDom();
    }
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    this.scheduleUpdate(0);
  },

  update: function () {
    var self = this;
    Log.info("Update Called");
    this.sendSocketNotification("UPDATE_DATA", null);
    self.scheduleUpdate();
  },
});
