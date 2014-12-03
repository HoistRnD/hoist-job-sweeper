'use strict';
var kueProxy = require('../kue_proxy');
var _ = require('lodash');

var logger = require('hoist-logger');
var BBPromise = require('bluebird');

function CompletedJobListener() {
  _.bindAll(this);
  this.queue = kueProxy.get();
  logger.info('setting up kue event listener for job complete');
  this.queue.on('job complete', this.onJobComplete);

}

CompletedJobListener.prototype.onJobComplete = function (id) {
  logger.info({
    id: id
  }, 'job complete received');
  kueProxy.kue.Job.get(id, _.bind(function (err, job) {
    if (job && job.type === 'RunModule') {
      this.processCompletedJob(job);
    }

  }, this));
};

CompletedJobListener.prototype.stop = function(){

};
CompletedJobListener.prototype.processCompletedJob = function (job) {
  logger.info({
    job: job
  }, 'processing completed job');
  var Model = require('hoist-model');
  var jobData = job.data;
  var logEvent = new Model.ExecutionLogEvent({
    type:'MDL',
    application: jobData.application._id,
    eventId: jobData.eventId,
    correlationId: jobData.correlationId,
    moduleName: jobData.moduleName,
    message: 'Module execution job complete for ' + jobData.moduleName + ' job #:' + job.id,
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



module.exports = CompletedJobListener;
