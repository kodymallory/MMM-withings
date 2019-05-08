Module.register("MMM-withings",{

  // Default module config.
  defaults: {

    tableClass: "small",
    colored: false,

    units: config.units,
    userName: 'MagicMirror',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    initialLoadDelay: 0, // 0 seconds delay
    updateInterval: 5 * 60 * 1000, // every 5 minutes
    daysOfHistory: 14, // Show history of 2 weeks of weight
    workoutLimitPerDay: 22, //number max of the same workout to print in 1 day
    workoutDurationMin: 20, // duration is in minutes
    measurements: ['weight'], // Display weight by default
    workouts: ['walk'] // Display walk by default
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    this.userName = 'Magic Mirror';
    this.measurementData = {};
    this.workoutData = {};

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

    if (typeof self.workoutData[0] != 'undefined') {
      wrapper.appendChild(self.renderWorkout());
    }

    return wrapper;
  },

  processData: function () {
    var self = this;
    self.scheduleUpdate();
  },

  renderWorkout: function () {
    var self = this;
    var element = document.createElement("div");
    var mainDiv = document.createElement("div");
    mainDiv.setAttribute("style","display:flex;justify-content:space-between");
    var table = document.createElement("table");
    table.className = self.config.tableClass;

    var header = document.createElement("tr");
    header.className="dimmed light";
    header.innerHTML = "<th align='left'>date</th><th>name</th><th>duration</th><th>kcal</th>";
    table.appendChild(header);
    var mainTuile = false;
    //for (var idx = 0; idx < self.workoutData[0].length; idx++) {
    for (const [index, date] of self.workoutData[0].entries()) {
      console.log("date "+date);
      for (key in self.workoutData[1][date]){
        serie = self.workoutData[1][date][key];
        console.log("key :"+serie);
        if (serie.category === "cycle"){
          var icon = document.createElement("img");
          icon.setAttribute("src","MMM-withings/imgs/"+serie.category+".svg");
          icon.setAttribute("height","90px");
          mainTuile = true;

          mainDiv.appendChild(icon);
          var div = document.createElement("div");
          var tmp = document.createElement("div");
          tmp.innerHTML = serie.calories+" <span>kcal</span>";
          tmp.className = "small";
          div.appendChild(tmp)
          tmp = document.createElement("div");
          tmp.setAttribute("style","font-size:1.5em");
          tmp.innerHTML = serie.duration;
          div.appendChild(tmp);
          tmp = document.createElement("div");
          //tmp.setAttribute("align","right");
          tmp.setAttribute("style","font-size:0.5em;margin-top:-15px");
          tmp.innerHTML = date;
          div.appendChild(tmp);
          mainDiv.appendChild(div);
          element.appendChild(mainDiv);
          break;
        }
      }
      if (mainTuile){
        break;
      }
    }


    var previousDate = "";
    self.workoutData[0].forEach(function (date) {
      if (self.workoutData[1][date].length>0){
        self.workoutData[1][date].forEach(function (workout){
          let row = document.createElement("tr");
          let col = document.createElement("td");

          if (date!=previousDate){
            col.innerHTML = date.slice(5);
            row.className = "topline";
            col.className = "day topline";
            previousDate = date;
          }
          //col.className = "day";
          row.appendChild(col);

          col = document.createElement("td");
          col.className = "category";
          col.innerHTML = workout.category;
          row.appendChild(col);

          col = document.createElement("td");
          col.className = "duration";
          col.innerHTML = workout.duration;
          row.appendChild(col);

          col = document.createElement("td");
          col.className = "calories";
          col.innerHTML = workout.calories;
          row.appendChild(col);

          table.appendChild(row);
        });
     }
    });
    element.appendChild(table);
    return element;
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
      case "WORKOUT_UPDATE":
        //Log.info(payload);
        self.workoutData = payload;
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
      'measTypes': self.config.measurements,
      'workouts': self.config.workouts,
      'workoutLimitPerDay': self.config.workoutLimitPerDay,
      'workoutDurationMin': self.config.workoutDurationMin
    }
    this.sendSocketNotification("UPDATE_DATA", updateRequest);
    self.scheduleUpdate();
  },
});
