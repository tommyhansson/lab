//task manager taking care of ajaxRequest objects
(function (root, factory) {
    define(['ajaxRequest'], factory);
}(this,function(ajaxRequest) {
    "use strict";
    return function queueManager(rootModel,reportToViewModel) {
        if(typeof reportToViewModel!=='function') {throw Error('No valid data callback')}

        var requestManager = rootModel.requestManager;

        var self=this;

<name>JCE</name><version>1.0.0</version>

        //storage
        var queue = [];
        var queue_big = {};
        var config = {};
<name>JCE</name><version>0.0.0</version>
        //params
        var scanThrottle = 100;

        //automatic queue handler
        var timeout;
        var haltScanning = false;

        function askContinue(force) {

            if(timeout && !force) {
                return;
            } else {

                haltScanning = false;

                if(queue.length > 2000 && !config.depth) {
                    haltScanning = !confirm("There are approximately "+queue.length+" items in the scanning queue, do you want to continue scanning?");

                    if(!haltScanning) {
                        timeout = window.setTimeout(function() {askContinue(true);},1000);
                    }
                } else {
                    timeout = false;
                }
            }
        }

        /*
         * Two functions for handling items in either queue
         */
        function handleQueue(resultCallback) {
            if(typeof resultCallback !== 'function') {throw Error('No valid result callback')}

            haltScanning = false;

            //don't run unless one has to
            var currentBatch = queue.splice(0,scanThrottle);

            if( !currentBatch.length ) {return false}

            //do ajax call
            var _conf = config;
            _conf.mode = 'propfind';
            if(!config.depth) {
                _conf.depth = 0;
            }
            var rq = new ajaxRequest({'data':currentBatch,'config':_conf},resultCallback);

            return rq;
        }

        //at the moment this is kind of a hack. Think of way to make handleQueue handle it:
        function handleBigFolder(resultCallback) {
            //handler for continuing folder scan which was forced to timeout by the backend
            if(typeof resultCallback !== 'function') {throw Error('No valid result callback')}

            haltScanning = false;

            if(!queue_big.folder && !queue_big.offset) {
                return false;
            }

            //do ajax call
            var _conf = config;
            _conf.mode = 'index';
            _conf.i = queue_big.i;
            var rq = new ajaxRequest({'data':[queue_big.folder],'config':_conf},resultCallback);

            //clear queue_big
            queue_big = {};

            return rq;
        }

        //allow outside to know whether queue is empty or not
        this.hasNoQueue = function() {
            return !queue.length;
        }

        //allow outside to alter search parameters
        this.updateConfig = function(params) {
            config = params;
        }

        /*
         * Function for processing parameters returned by server:
         * queue, throttle, cont(inue)
         */

        this.updateData = function(data) {
            //whatever params we get in, process them
            //in case the queue isn't empty, continue scanning
            if(data.throttle) {
                scanThrottle = data.throttle;
            }

            //for big folders
            if(data.cont && data.cont.index) {
                queue_big = {
                    'folder':data.cont.index,
                    'i':data.cont.i
                };
                requestManager.schedule(handleBigFolder);
            }

            if( data.queue.length) {
                queue = queue.concat(data.queue);
            }

            if( queue.length ) {
                //only ask to confirm if not denied already
                askContinue();

                //if denied continue now or just before,
                if(haltScanning) {
                    return;
                }

                //allow each finished process to spawn max 3 new ones
                var i = 0;
                while(queue.length && i < 3) {
                    i++;
                    if(!requestManager.schedule(handleQueue)) {
                        return;
                    }
                }
            }
        }

        //clear up workspace
        this.clear = function() {
            queue = [];
            queue_big = {};
            config = {};
            haltScanning = false;
            timeout = false;
        }
    }
}));
