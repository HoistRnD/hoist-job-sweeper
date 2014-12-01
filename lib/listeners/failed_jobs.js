'use strict';
var kueProxy = require('../kue_proxy');
var _ = require('lodash');

var logger = require('hoist-logger');
var BBPromise = require('bluebird');

function FailedJobListener() {
  _.bindAll(this);
  this.queue = kueProxy.get();
  logger.info('setting up kue event listener for job failed');
  this.queue.on('job failed', this.onJobFailed);

}

FailedJobListener.prototype.onJobFailed = function (id) {
  logger.info({
    id: id
  }, 'job failed received');
  kueProxy.kue.Job.get(id, _.bind(function (err, job) {
    if (job && job.type === 'RunModule') {
      this.processFailedJob(job);
    }
  }, this));
};

FailedJobListener.prototype.processFailedJob = function (job) {
  logger.warn({
    job: job
  }, 'processing failed on job');
  var Model = require('hoist-model');
  var jobData = job.data;
  var logEvent = new Model.ExecutionLogEvent({
    application: jobData.application._id,
    eventId: jobData.eventId,
    correlationId: jobData.correlationId,
    moduleName: jobData.moduleName,
    message: 'Module execution job failed for ' + jobData.moduleName + ' job #:' + job.id,
    environment: jobData.environment
  });
  logEvent.saveAsync().then(function () {
    return BBPromise.promisify(job.remove, job)()
      .catch( /* istanbul ignore next */ function (error) {
        logger.alert(error, jobData.applicationId, {
          job: job
        });
        logger.error(error);
      });
  }).catch( /* istanbul ignore next */ function (err) {
    logger.error(err);
    logger.alert(err, jobData.applicationId, {
      job: job
    });
  });
};



module.exports = FailedJobListener;
