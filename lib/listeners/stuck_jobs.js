'use strict';
var kueProxy = require('../kue_proxy');
var _ = require('lodash');
var moment = require('moment');
var logger = require('hoist-logger');
var BBPromise = require('bluebird');
var alertedJobs = {};

function StuckJobListener() {
  _.bindAll(this);
  this.queue = kueProxy.get();
  logger.info('setting up kue event listener for stuck jobs');
  this.pollForStuckJobs();
}

StuckJobListener.prototype.pollForStuckJobs = function () {
  logger.info('polling for inactive jobs');
  return new BBPromise(_.bind(function (resolve, reject) {
      this.queue.inactive(function (err, jobIds) {
        if (err) {
          reject(err);
        } else {
          resolve(jobIds);
        }
      });
    }, this))
    .bind(this).then(function (jobIds) {
      this.processInaciveJobs(jobIds);
    }, this)
    .then(function () {
      logger.info('pausing for 20 seconds');
      return BBPromise.delay(20000);
    }).then(function () {
      return this.pollForStuckJobs();
    }).catch(function (err) {
      console.log(err);
    });
};
StuckJobListener.prototype.processInaciveJobs = function (jobIds) {
  if (!jobIds) {
    jobIds = [];
  }

  logger.info('retrieved ' + jobIds.length + ' jobs');
  if (jobIds.length === 0) {
    return BBPromise.resolve(null);
  }
  return BBPromise.all(_.map(jobIds, _.bind(function (id) {
    console.log('retrieving job');
    return BBPromise.promisify(kueProxy.kue.Job.get, kueProxy.kue.Job)(id)
      .bind(this)
      .then(function (job) {
        if (job.type === 'RunModule') {
          this.processStuckJob(job);
        }
      });
  }, this)));
};
StuckJobListener.prototype.processStuckJob = function (job) {
  var lowWater = moment().subtract(2, 'minutes');
  logger.debug(job);
  var updatedAt = moment(job.updated_at, 'x'); // jshint ignore:line
  logger.debug(updatedAt.format());
  logger.debug(lowWater.format());
  if (updatedAt.isBefore(lowWater)) {
    if (!alertedJobs[job.id]) {
      alertedJobs[job.id] = true;
      logger.alert(new Error('job seems to be stuck on queue'), job.data.applicationId, {
        job: job
      });
      logger.warn({
        job: job
      }, 'job seems to be stuck on queue');
    }
  }
};



module.exports = StuckJobListener;
