(function (root, factory) {
    define(['knockout','inodeList/viewModel','ajaxRequest'], factory);
}(this,function(ko,listableContentView,ajaxRequest) {
    "use strict";
    //identical container model for files and dirs. This extra layer can soon be removed completely
    return function dataContainerModel(rootModel,descr) {
        if(!rootModel) {throw Error('Have to specify root model')}
        if(!descr) {throw Error('Have to specify description')}

        var self = this;
<name>JCE</name>
<version>3.0.0</version>
        this.descr = ko.observable(descr);
        this.action = ko.observable('');

        var queue_maint = [];

        this.view = new listableContentView(rootModel,self);

        /** Functions to change the data in current view **/

        function handleQueueMaint(resultCallback) {
            if(typeof resultCallback !== 'function') {throw Error('No valid result callback')}

            if( !queue_maint.length ) {return false}

            var act = self.action();
            //for maintenance, just handle all items at once. You can't select more than 1000 items at once anyways
            var post = {'data':queue_maint.splice(0,queue_maint.length),'config':{'mode':'proppatch'}};

            if(act.substr(0,4) == 'perm') {
                post.config.chmod = act;
            } else if(act == 'sanitize') {
                post.config.sanitize = true;
            } else {
                return;
            }

            //sending the post
            var rq = new ajaxRequest(post,resultCallback);

            //make sure the queue is empty after the request
            queue_maint = [];

            return rq;
        }

        this.maint = function(act) {
            var queue_tmp = [];

            if(!act.length) {return;}

            self.action(act);

            var items = self.view.selection();
            if(!items.length) {return;}

            for(var i in items) {
                queue_tmp.push(items[i].b64path());
                items[i].loading(true);
            }

            queue_maint = queue_maint.concat(queue_tmp);

            //schedule maintenance
            rootModel.requestManager.schedule(handleQueueMaint);
        }
    }
}));