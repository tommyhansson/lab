//task manager taking care of ajaxRequest objects
define(['knockout'],function(ko) {
    "use strict";
    return function requestManager(reportToViewModel) {
        if(typeof reportToViewModel !== 'function') {throw Error('No valid data callback')}

        var self = this;
        var queuedRQs = [];

        var activeRQs = ko.observableArray([]);

        var maxWorkers = 10;

        var abortCalled = false;
        var pauseCalled = false;

        var timeoutActive = ko.observable(false);

        var work = function() {
            timeoutActive(false);
            while(queuedRQs.length && activeRQs().length < maxWorkers) {
                //the queue holds callbacks to be executed. They should themselves return their data to reportTaskDone
                var rq = queuedRQs.shift();
                if(rq && rq.post()) {
                    activeRQs.push(rq);
                }
            }
        };

        //automatic queue handler

        var toggle = function() {
            if(timeoutActive()) {
                window.clearTimeout(timeoutActive());
                timeoutActive(false);
            }

            timeoutActive(window.setTimeout(work,30));
            abortCalled = false;
        };

        //this one sends the data back to the viewModel
        var reportTaskDone = function(data,rq) {
            activeRQs.remove(rq);
            if(!abortCalled) {
                reportToViewModel(data);

                //in case we hit maxWorkers before, try doing some new requests
                toggle();
            }
        };

        //this one gets called from the viewModel
        //return bool(true||false) depending if building+queueing the request worked or not
        self.schedule = function(buildRQ) {
            //prepare the request
            var rq = buildRQ(reportTaskDone);
            if(!rq) {
                throw new Error('Building request failed');
            }

            //add request to queue
            queuedRQs.push(rq);
            toggle();
            return true;
        };

        //if viewModel thinks all requests should stop
        self.abort = function() {
            abortCalled = true;
            queuedRQs = [];
            var rq = null;
            while(activeRQs().length) {
                rq = activeRQs.shift();
                rq.abort();
            }
        };


        //if viewModel thinks all requests should be paused (something else)
        self.pauseScans = function() {
            pauseCalled = true;

            var rq = null;
            while(activeRQs().length) {
                rq = activeRQs.shift();
                rq.abort();
                queuedRQs.push(rq);
            }
        };

        self.continueScans = function() {
            if(pauseCalled && queuedRQs.length) {
                toggle();
                return true;
            }
            return false;
        };

        self.isRunning = ko.computed(function() {
            return activeRQs().length || timeoutActive();
        }).extend({'throttle':30});
    }
});