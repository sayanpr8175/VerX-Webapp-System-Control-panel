var baseHost = window.location.hostname;
var baseEndpoint = 'http://' + baseHost;

var ctx = document.getElementById('dataplot').getContext('2d');
var dataChart;

var RELAY_STATE_MESSAGE = 10;

function relayButton(id, name, state, onChange) {
  var self = this;

  self.id = ko.observable(id);
  self.name = ko.observable(name);
  self.state = ko.observable(state);

  self.state.subscribe(function(newValue) {
    onChange(self, newValue);
  });
}

function BaseViewModel(defaults, remoteUrl, mappings) {
  if (mappings === undefined) {
    mappings = {};
  }
  var self = this;
  self.remoteUrl = remoteUrl;

  ko.mapping.fromJS(defaults, mappings, self);
  self.fetching = ko.observable(false);
}

BaseViewModel.prototype.update = function(after) {
  if (after == undefined) {
    after = function() {};
  }
  var self = this;
  self.fetching(true);
  $.get(self.remoteUrl, function(data) {
    ko.mapping.fromJS(data, self);
  }, 'json').always(function() {
    self.fetching(false);
    after();
  });
};

function StatusViewModel() {
  var self = this;

  BaseViewModel.call(self, {
    "relay_1_state": false,
    "relay_2_state": false,
    "relay_3_state": false,
    "dallas_temperature": "",
    "dht_temperature": "",
    "dht_humidity": ""
  }, baseEndpoint + '/status');
}
StatusViewModel.prototype = Object.create(BaseViewModel.prototype);
StatusViewModel.prototype.constructor = StatusViewModel;

function ConfigViewModel() {
  var self = this;

  BaseViewModel.call(self, {
    "relay_1_name": "Relay 1",
    "relay_2_name": "Relay 2",
    "relay_3_name": "Relay 3"
  }, baseEndpoint + '/config');
}
ConfigViewModel.prototype = Object.create(BaseViewModel.prototype);
ConfigViewModel.prototype.constructor = ConfigViewModel;

function LastValuesViewModel() {
  var self = this;
  self.remoteUrl = baseEndpoint + '/lastvalues';

  self.fetching = ko.observable(false);
  self.values = ko.mapping.fromJS([]);

  self.update = function(after) {
    if (after == undefined) {
      after = function() {};
    }
    var self = this;
    self.fetching(true);
    $.get(self.remoteUrl, function(data) {
      var namevaluepairs = data.split(",");
      var vals = [];
      for (var z in namevaluepairs) {
        var namevalue = namevaluepairs[z].split(":");
        var units = "";
        if (namevalue[0].indexOf("T1") === 0) units = String.fromCharCode(176) + "C";
        if (namevalue[0].indexOf("H") === 0) units = String.fromCharCode(37);
        if (namevalue[0].indexOf("T2") === 0) units = String.fromCharCode(176) + "C";
        vals.push({
          key: namevalue[0],
          value: namevalue[1] + units
        });
      }
      ko.mapping.fromJS(vals, self.values);
    }, 'text').always(function() {
      self.fetching(false);
      after();
    });
  };
}

function LogsViewModel() {
  var self = this;
  self.remoteUrl = baseEndpoint + '/lastvalues';

  self.fetching = ko.observable(false);
  self.entries = ko.mapping.fromJS([]);

  let oldData = "";

  self.update = function(after) {
    if (after == undefined) {
      after = function() {};
    }
    var self = this;
    self.fetching(true);
    $.get(self.remoteUrl, function(data) {
      if (data !== oldData) {
        var logEntries = self.entries.slice();
        logEntries.push({
          timestamp: new Date().toISOString(),
          log: data
        });
        ko.mapping.fromJS(logEntries, self.entries);
        oldData = data;
      }
    }, 'text').always(function() {
      self.fetching(false);
      after();
    });
  };
}

function GraphViewModel() {
  var self = this;
  self.remoteUrl = baseEndpoint + '/lastvalues';

  // chart.js config arrays
  var graphColors = [
    '#1cc88a',
    '#858796',
    '#858796',
    '#d9534f',
    '#5bc0de',
    '#0275d8',
  ];
  var graphLabels = ["R1", "R2", "R3", "T1", "H", "T2"];
  var datasets = [];

  var maxDataPoints = 20;

  self.fetching = ko.observable(false);

  self.handleData = function(data) {
    var vals = [];
    for (var i in data) {
      var namevalue = data[i].split(":");

      vals.push({
        key: namevalue[0],
        value: namevalue[1]
      });
    }
    var today = new Date();
    var t = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    self.addData(dataChart, vals, t);
  };

  self.addData = function(chart, data, label) {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset, index) => {
      dataset.data.push(data[index].value);
    });
    if (chart.data.labels.length > maxDataPoints) {
      self.removeData(chart);
    }
    chart.update();
  };

  self.removeData = function(chart) {
    chart.data.labels.shift();
    chart.data.datasets.forEach((dataset) => {
      dataset.data.shift();
    });
  };

  self.update = function(after) {
    if (after == undefined) {
      after = function() {};
    }

    self.fetching(true);
    $.get(self.remoteUrl, function(data) {
      var namevaluepairs = data.split(",");
      self.handleData(namevaluepairs);
    }, 'text').always(function() {
      self.fetching(false);
      after();
    });
  };

  self.init = function() {
    var options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        xAxes: [{
          gridLines: {
            display: false,
            drawBorder: false
          },
          ticks: {
            maxTicksLimit: 5,
            //autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          }
        }],
        yAxes: [{
          id: 'relayData',
          type: 'linear',
          position: 'right',
          ticks: {
            beginAtZero: true,
            stepSize: 1,
            max: 1,
            min: 0
          }
        }, {
          id: 'sensorData',
          type: 'linear',
          position: 'left',
          ticks: {
            maxTicksLimit: 5,
            padding: 10,
          },
          gridLines: {
            color: "rgb(234, 236, 244)",
            zeroLineColor: "rgb(234, 236, 244)",
            drawBorder: false,
            borderDash: [2],
            zeroLineBorderDash: [2]
          }
        }],
      }
    };

    //Populate datasets array
    for (var i = 0; i < graphLabels.length; i++) {
      if (graphLabels[i] === "R1" ||
        graphLabels[i] === "R2" ||
        graphLabels[i] === "R3") {
        datasets.push({
          label: graphLabels[i],
          yAxisID: 'relayData',
          lineTension: 0.3,
          backgroundColor: "rgba(78, 115, 223, 0.05)",
          borderColor: graphColors[i],
          pointRadius: 3,
          pointBackgroundColor: graphColors[i],
          pointBorderColor: graphColors[i],
          pointHoverRadius: 3,
          pointHoverBackgroundColor: graphColors[i],
          pointHoverBorderColor: graphColors[i],
          pointHitRadius: 10,
          pointBorderWidth: 2,
          steppedLine: true,
          data: []
        });
      } else {
        datasets.push({
          label: graphLabels[i],
          yAxisID: 'sensorData',
          lineTension: 0.3,
          backgroundColor: "rgba(78, 115, 223, 0.05)",
          borderColor: graphColors[i],
          pointRadius: 3,
          pointBackgroundColor: graphColors[i],
          pointBorderColor: graphColors[i],
          pointHoverRadius: 3,
          pointHoverBackgroundColor: graphColors[i],
          pointHoverBorderColor: graphColors[i],
          pointHitRadius: 10,
          pointBorderWidth: 2,
          steppedLine: false,
          data: []
        });
      }
    }
    dataChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: datasets
      },
      options: options
    });
  };
}

function MainViewModel() {
  var self = this;

  self.status = new StatusViewModel();
  self.config = new ConfigViewModel();
  self.last = new LastValuesViewModel();
  self.logs = new LogsViewModel();
  self.graph = new GraphViewModel();

  self.initialised = ko.observable(false);
  self.updating = ko.observable(false);

  //logs cookie set
  self.logs_enabled = ko.observable(false);
  self.logs_enabled.subscribe(function(val){
    self.setCookie("logs_enabled", val.toString());
  });

  //Latest data cookie set
  self.latest_data_enabled = ko.observable(false);
  self.latest_data_enabled.subscribe(function(val){
    self.setCookie("latest_data_enabled", val.toString());
  });

  var updateTimer = null;
  var updateTime = 1 * 1000;

  //Relay slider switches
  self.availableRelays = ko.observableArray([]);
  self.activeRelays = ko.pureComputed(function() {
    return self.availableRelays().filter(function(relay) {
      return relay.state();
    });
  });

  // Log changes to the console
  self.activeRelays.subscribe(function(sel) {
    console.log("Active Relays are: " + sel.map(function(s) {
      return s.name();
    }).join(", "));
  });

  // Log the individual that caused the change
  self.onRelayStateChange = function(item, newValue) {
    console.log("State chnage event: " + item.name() + "(" + newValue + ")");
  };


  // -----------------------------------------------------------------------
  // Initialise the app
  // -----------------------------------------------------------------------
  self.start = function() {
    self.updating(true);
    self.config.update(function() {
      self.status.update(function() {
        self.last.update(function() {
          self.init(function() {
            self.connect();
            //set the logs and latest data modes from cookies
            self.latest_data_enabled(self.getCookie("latest_data_enabled", "false") === "true" );
            self.logs_enabled(self.getCookie("logs_enabled", "false") === "true" );
            self.initialised(true);
            updateTimer = setTimeout(self.update, updateTime);
            self.updating(false);
          });
        });
      });
    });
  };

  // -----------------------------------------------------------------------
  // Initialise graph and relay slider switches
  // -----------------------------------------------------------------------
  self.init = function(after) {
    if (after == undefined) {
      after = function() {};
    }
    self.graph.init();
    self.availableRelays([
      new relayButton(1, self.config.relay_1_name(), self.status.relay_1_state(), self.onRelayStateChange),
      new relayButton(2, self.config.relay_2_name(), self.status.relay_2_state(), self.onRelayStateChange),
      new relayButton(3, self.config.relay_3_name(), self.status.relay_3_state(), self.onRelayStateChange),
    ]);
    after();
  };

  // -----------------------------------------------------------------------
  // Get the updated state from the ESP
  // -----------------------------------------------------------------------
  self.update = function() {
    if (self.updating()) {
      return;
    }
    self.updating(true);
    if (null !== updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    self.status.update(function() {
      self.refreshRelayStates();
      self.last.update(function() {
        self.logs.update(function() {
          self.graph.update(function() {
            updateTimer = setTimeout(self.update, updateTime);
            self.updating(false);
          });
        });
      });
    });
  };

  self.refreshRelayStates = function() {
    self.availableRelays()[0].state(self.status.relay_1_state());
    self.availableRelays()[1].state(self.status.relay_2_state());
    self.availableRelays()[2].state(self.status.relay_3_state());
  };

  // -----------------------------------------------------------------------
  // Event: Relay Switch CLick
  // -----------------------------------------------------------------------
  self.onSwitchClick = function(item) {
    console.log(ko.unwrap(item.state()));
    self.sendRelayMsg(item, item.state());
    return true;
  };

  // -----------------------------------------------------------------------
  // Websocket
  // -----------------------------------------------------------------------
  self.pingInterval = false;
  self.reconnectInterval = false;
  self.socket = false;
  self.wsEndpoint = "ws://" + baseHost + '/ws';

  self.connect = function() {
    self.socket = new WebSocket(self.wsEndpoint);
    self.socket.onopen = function(ev) {
      self.pingInterval = setInterval(function() {
        self.socket.send("{\"ping\":1}");
      }, 1000);
    };
    self.socket.onclose = function(ev) {
      self.reconnect();
    };
    self.socket.onmessage = function(msg) {
      console.log(msg);
    };
    self.socket.onerror = function(ev) {
      console.log(ev);
      self.socket.close();
      self.reconnect();
    };
    self.reconnect = function() {
      if (false !== self.pingIntert) {
        clearInterval(self.pingInterval);
        self.pingInterval = false;
      }
      if (false === self.reconnectInterval) {
        self.reconnectInterval = setTimeout(function() {
          self.reconnectInterval = false;
          self.connect();
        }, 500);
      }
    };
  };

  // -----------------------------------------------------------------------
  // Websockets relay message
  // -----------------------------------------------------------------------
  self.sendRelayMsg = function(relay, state) {
    var msg = {
      type: RELAY_STATE_MESSAGE,
      id: relay.id(),
      name: relay.name(),
      state: state
    };
    console.log(JSON.stringify(msg));
    self.socket.send(JSON.stringify(msg));
  };


  // -----------------------------------------------------------------------
  // Cookie management, based on https://www.w3schools.com/js/js_cookies.asp
  // -----------------------------------------------------------------------
  self.setCookie = function(cname, cvalue, exdays = false) {
    var expires = "";
    if (false !== exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      expires = ";expires=" + d.toUTCString();
    }
    document.cookie = cname + "=" + cvalue + expires + ";path=/";
  };

  self.getCookie = function(cname, def = "") {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return def;
  };

}

$(function() {
  var vm = new MainViewModel();
  ko.applyBindings(vm);
  vm.start();
});
