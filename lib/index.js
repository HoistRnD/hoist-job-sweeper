'use strict';
var CompletedJobs = require('./listeners/completed_jobs');
var BBPromise = require('bluebird');
var _ = require('lodash');
var logger = require('hoist-logger');
var listeners = [];

module.exports = {
  start: function () {
    return this.stop().then(function () {
      logger.info('starting up completed job listener');
      listeners.push(new CompletedJobs());
    });
  },
  stop: function () {
    var listenerCache = listeners;
    listeners = [];
    return BBPromise.all(_.map(listenerCache, function (listener) {
      logger.info({
        listener: listener.constructor.name
      }, 'stopping job listner');
      listener.stop();
    }));
  }
};
