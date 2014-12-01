
'use strict';
var BBPromise = require('bluebird');
var kue = require('kue');
var jobs;
var config = require('config');

/* istanbul ignore next */
module.exports = {
  get: function () {
    return jobs || (jobs = BBPromise.promisifyAll(kue.createQueue({
      redis: {
        host: config.get('Hoist.kue.host')
      }
    })));
  }
};
module.exports.kue = kue;
