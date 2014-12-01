'use strict';
require('../bootstrap');
var expect = require('chai').expect;
var CompletedJobsListener = require('../../lib/listeners/completed_jobs');
var BBPromise = require('bluebird');
var kueProxy = require('../../lib/kue_proxy');
var Model = require('hoist-model');
var sinon = require('sinon');
describe('CompletedJobsListener', function () {
  var stubKue = {
    on: sinon.stub()
  };
  var listener;
  before(function () {
    sinon.stub(kueProxy, 'get').returns(stubKue);
    listener = new CompletedJobsListener();
  });
  after(function () {
    kueProxy.get.restore();
  });
  it('subscribes to completed jobs event', function () {
    return expect(stubKue.on)
      .to.have.been
      .calledWith('job complete', listener.onJobComplete);
  });
  describe('#onJobComplete', function () {
    describe('with a RunModule job', function () {
      var job = {
        type: 'RunModule'
      };
      before(function () {
        sinon.stub(listener, 'processCompletedJob');
        sinon.stub(kueProxy.kue.Job, 'get').yields(null, job);
        listener.onJobComplete('job_id');
      });
      after(function () {
        listener.processCompletedJob.restore();
        kueProxy.kue.Job.get.restore();
      });
      it('loads job correctly', function () {
        return expect(kueProxy.kue.Job.get)
          .to.have.been
          .calledWith('job_id');
      });
      it('passes job to #processCompletedJob', function () {
        return expect(listener.processCompletedJob)
          .to.have.been
          .calledWith(job);
      });
    });
    describe('with another type of job', function () {
      var job = {
        type: 'OtherType'
      };
      before(function () {
        sinon.stub(listener, 'processCompletedJob');
        sinon.stub(kueProxy.kue.Job, 'get').yields(null, job);
        listener.onJobComplete('job_id');
      });
      after(function () {
        listener.processCompletedJob.restore();
        kueProxy.kue.Job.get.restore();
      });
      it('loads job correctly', function () {
        return expect(kueProxy.kue.Job.get)
          .to.have.been
          .calledWith('job_id');
      });
      it('passes job to #processCompletedJob', function () {
        return expect(listener.processCompletedJob)
          .to.not.have.been
          .called;
      });
    });
    describe('#processCompletedJob', function () {
      var job = {
        type: 'RunModule',
        id: 1,
        data: {
          application: {
            _id: 'appId'
          },
          environment: 'live',
          correlationId: 'cid',
          eventId: 'eventId',
          moduleName: 'moduleName'

        },
        remove: sinon.stub().yields()
      };
      before(function () {
        sinon.stub(Model.ExecutionLogEvent.prototype, 'saveAsync').returns(BBPromise.resolve(null));
        sinon.spy(Model, 'ExecutionLogEvent');
        listener.processCompletedJob(job);
      });
      after(function () {
        Model.ExecutionLogEvent.restore();
        Model.ExecutionLogEvent.prototype.saveAsync.restore();

      });
      it('saves log event', function () {
        return expect(Model.ExecutionLogEvent.prototype.saveAsync)
          .to.have.been.called;
      });
      it('creats correct log event', function () {
        return expect(Model.ExecutionLogEvent)
          .to.have.been
          .calledWith({
            application: "appId",
            correlationId: "cid",
            environment: "live",
            eventId: "eventId",
            message: "Module execution job complete for moduleName job #:1",
            moduleName: "moduleName"
          });
      });
      it('deletes the job', function () {
        return expect(job.remove)
          .to.have.been.called;
      });

    });
  });
});
