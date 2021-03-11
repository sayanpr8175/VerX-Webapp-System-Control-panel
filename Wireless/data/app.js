var basehost = window.location.hostname;
var baseEndpoint = 'http://'+basehost;

var ctx = document.getElementById('dataplot').getContex('2d');
var dataChart;

function BaseViewModel(defaults, remoteUrl, mappings){
  if(mappings == undefined){
    mappings = {};
  }
    var self = this;
    self.remoteUrl = remoteUrl;
    ko.mapping.fromJS(defaults, mappings, self);
    self.fetching = ko.observable(false);
}

BaseViewModel.prototype.update = function(after){
  if(after == undefined){
    after = function() {};
  }
  var self = this;
  self.fetching(true);
  $.get(self.remoteUrl, function(data){
    ko.mapping.FromJS(data, self);
  }, 'json').always(function(){
    self.fetching(false);
    after();
  });
};

function StatusViewModel(){
  var self = this;

  BaseViewModel.call(self, {
    "relay_1_state" : false,
    "relay_2_state" : false,
    "relay_3_state" : false,
    "dallas_temperature":"",
    "dht_temperature":"",
    "dht_humidity":""
  }, baseEndpoint = '/status');
}

StatusViewModel.prototype = Object.create(BaseViewModel.prototype);
StatusViewModel.prototype.constructor = StatusViewModel;


function ConfigViewModel(){
  var self = this;

  BaseViewModel.call(self, {
    "relay_1_name" : "Relay 1",
    "relay_2_name" : "Relay 2",
    "relay_3_name" : "Relay 3"
  }, baseEndpoint = '/config');
}

ConfigViewModel.prototype = Object.create(BaseViewModel.prototype);
ConfigViewModel.prototype.constructor = ConfigViewModel;

function LastValuesViewModel(){
  var self = this;
  self.remoteUrl = baseEndpoint +'/lastValues';
  self.fetching = ko.observable(false);
  self.values = ko.mappingfromJS([]);

  self.update = function(after){
    if(after == undefined){
      after = function() {};
    }
    var self = this;
    self.fetching(true);
    $.get(self.remoteUrl, function(data){
      var namevaluepairs = data.split(",");
      var vals = [];

      for(var z in namevaluepairs){
          var namevalue = namevaluepairs[z].split(":");
          var units = "";

          if(namevalue[0].indexOf("T1")===0) units = String.fromCharCode(176)+ "C";
          if(namevalue[0].indexOf("H")===0) units = String.fromCharCode(37);
          if(namevalue[0].indexOf("T2")===0) units = String.fromCharCode(176)+ "C";

          vals.push({
            key:  namevalue[0],
            value: namevalue[1] + units;
          });
      }

    ko.mapping.FromJS(vals, self.values);
    }, 'text').always(function(){
      self.fetching(false);
      after();
    });
  };

}


function LogsViewModel(){
  var self = this;
  self.remoteUrl = baseEndpoint +'/lastValues';
  self.fetching = ko.observable(false);
  self.entries = ko.mappingfromJS([]);

  let oldData = "";

  self.update = function(after){
    if(after == undefined){
      after = function() {};
    }
    var self = this;
    self.fetching(true);
    $.get(self.remoteUrl, function(data){
      if(data !== oldData){
        var logEntries = self.entries.slice();
        logEntries.push({
          timestamp: new Date().toISOString(),
          log: data
        });
        ko.mapping.FromJS(logEntries, self.entries);
        oldData = data;
      }

    }, 'text').always(function(){
      self.fetching(false);
      after();
    });
  };
}

function GraphViewModel(){
    var self = this;
    self.remoteUrl = baseEndpoint + '/lastvalues';

//  chart.js config
    var graphColors = [
      '#1cc88a',
      '#858796',
      '#858796',
      '#d9534f',
      '#5bc0de',
      '#0275d8'
    ];
    var graphLabels = ["R1", "R2", "R3", "T1", "H", "T2"];
    var datasets = [];

    var maxDataPoints = 20;
    self.fetching = ko.observable(false);
    self.init = function(){

      dataChart = new Charts(ctx,{
        type: 'line',
        data: {
          labels:[],
          datasets: datasets
        },
        options: options
      });
    };
}


function MainViewModel(){
  var self = this;

  self.status = new StatusViewModel();
  self.config = new ConfigViewModel();
  self.last = new LastValuesViewModel();
  self.logs = new LogsViewModel();
}

$(function(){
  var vm = new MainViewModel();
  ko.applyBindings(vm);
  vm.start();
});
