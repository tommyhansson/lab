(function (root, factory) {
    define(['knockout','bindingHandlers/byteString','bindingHandlers/dateString'], factory);
}(this,function(ko) {
    ko.writeOnceObservable = function (initialValue) {
        /*
         * fake observable to which data is supposed to be written only
         * during initalization. No subscriptions will be kept or updated
         */

        var _latestValue = initialValue;

        return function() {
            if (arguments.length) {
                // Write
                _latestValue = arguments[0];
                return this; // Permits chained assignments
            }
            else {
                // Read
                return _latestValue;
            }
        }
    }

    var inodeItem = function(data) {
        var self = this;

        //index (inode number)
        this.ino = '';

        this.selected = ko.observable(false);
        this.focused = ko.observable(false);
        this.loading = ko.observable(false);

        //vars for file path/name
        this.urlPath = ko.observable(data.urlPath || '');
        this.b64path = ko.observable(data.b64path || '');
        this.name = ko.observable(data.name || '');
        this.ext = ko.writeOnceObservable(data.ext || '');//no need to be observable
        this.in_docroot = ko.writeOnceObservable(data.in_docroot || '');//no need to be observable

        this.showInternalURL = ko.writeOnceObservable(true);//no need to be observable
        this.pathenc_fail = ko.observable(data.pathenc_fail || false);

        //stat
        this.type = ko.writeOnceObservable(data.type || '');//no need to be observable
        this.mode = ko.observable(data.mode || '');
        this.size = ko.writeOnceObservable(data.size || 0);//no need to be observable
        this.mtime = ko.writeOnceObservable(data.mtime || '');//no need to be observable
        this.islink = ko.writeOnceObservable(data.islink || false);//no need to be observable
        this.uid_fail = ko.observable(data.uid_fail || false);

        //content
        this.binary = ko.writeOnceObservable(data.binary || '');//no need to be observable
        this.matches = ko.observableArray([]);

        if(data.matches) {
            this.matches(data.matches);
        }

        this.bom = ko.writeOnceObservable(data.bom || false);//no need to be observable

        //computed vars
        this.internalURL = ko.computed(function() {
            if(self.type()=='file') {
                return '/cgi-bin/diagnostics/fileview.pl?b64path='+encodeURIComponent(self.b64path());
            } else {
                return '#'+encodeURIComponent(self.b64path());
            }
        });

        this.matchesString = ko.computed(function() {
            var matches = self.matches(),
                string = '';

            for(var y in matches) {
                string += y+':'+matches[y]+'<br>';
            }
            return string;
        });

        //initialization function
        this.update = function(data) {
            for (var field_name in data) {
                if(!self[field_name]) {
                    throw Error('Unsupported input: '+field_name);
                }
                self[field_name](data[field_name]);
            }

            self.loading(false);
        }

        self.showInternalURL( !self.binary() && self.size() < 2097152 );
    }
    return inodeItem;
}));