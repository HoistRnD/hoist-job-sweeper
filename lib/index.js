'use strict';
var CompletedJobs = require('./listeners/completed_jobs');
var FailedJobs = require('./listeners/failed_jobs');
var StuckJobs = require('./listeners/stuck_jobs');
var BBPromise = require('bluebird');
var _ = require('lodash');
var config = require('config');
var logger = require('hoist-logger');
var mongoose = BBPromise.promisifyAll(require('hoist-model')._mongoose);
var listeners = [];
var connection;

module.exports = {
  connect: function () {
    return connection || (connection = mongoose.connectAsync(config.get('Hoist.mongo.db')));
  },
  disconnect: function () {
    if (connection) {
      logger.info('disconnecting from mongo');
      return mongoose.disconnectAsync();
    } else {
      return BBPromise.resolve(null);
    }
  },
  start: function () {
    return this.stop().bind(this).then(function () {
      logger.info('connecting to mongo');
      return this.connect();
    }).then(function () {
      logger.info('starting up completed job listener');
      listeners.push(new CompletedJobs());
      logger.info('starting up failed job listener');
      listeners.push(new FailedJobs());
      logger.info('starting up stuck job listener');
      listeners.push(new StuckJobs());
    });
  },
  stop: function () {
    var listenerCache = listeners;
    listeners = [];
    return this.disconnect().bind(this).then(function () {
      return BBPromise.all(_.map(listenerCache, function (listener) {
        logger.info({
          listener: listener.constructor.name
        }, 'stopping job listner');
        listener.stop();
      }));
    });
  }
};
