//middleware to set up an XHR which can be (re)started and aborted on demand
(function (root, factory) {
    define(['jQuery'], factory);
}(this,function() {
    "use strict";
    /**
     * Set up a POST request
     * Then do requestManager.schedule(ajaxRequest.post)
     *
    */

    return function(inputdata,callback) {
        var self = this;

        var params = {
            'config':{},
            'data':[]
        };

        for(var i in inputdata) {
            params[i] = inputdata[i];
        }

        var _xhrThread = null;

        self.post = function() {
            _xhrThread = jQuery.ajax({
                'type': 'POST',
                'url': "kjsonrpc.php",
                'dataType': "json",
                'contentType': 'application/json; charset=utf-8',
                'data': JSON.stringify(params),
                'processData':false,
                'success': function(data) {
                    //
                    callback(data,self);
                },
                'error': function(request) {
                    //if http error, show it
                    if(request.status) {
                        var data = {'err':'<b>'+request.status +' '+ request.statusText +'</b>. Please report'};
                        callback(data,self);
                    }
                }
            });

            return true;
        }
        self.abort = function() {
            if(_xhrThread) {_xhrThread.abort()}
        }
    }
}));