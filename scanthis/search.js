//viewModel for file search module
/*
 * Current structure, which is not desired:
 * fileSearchViewModel
 *  has one: fileSearchConfig
 *   has many: fileSearchItem
 *    has many: search/param
 *
 * Desired structure would be:
 * viewModel
 *  has many: search
 *   has many: search/param
 */
(function (root, factory) {
    define(['knockout','Base64','search/param','moment','module','jQuery','extenders/byteString'], factory);
}(this,function(ko,Base64,paramConstructor,moment,module) {
    "use strict";

    function fileSearchItem(presetName) {
        var self = this;
        var _conf = module.config();

        this.params = ko.observableArray([]);

        this.addParam = function(paramName) {
            var param = new paramConstructor();
            if(typeof paramName === 'string' && paramName.length > 1) {
                param.type(paramName);
            }
            self.params.push(param);
        }

        this.getFirstParam = function(paramName) {
            var params = self.params(),
                len = params.length,
                i = 0;

            for(;i<len;i++) {
                if(params[i].type() == paramName) {
                    return params[i];
                }
            }
            return false;
        }

        this.delParam = function(item) {
            self.params.remove(item);
        }

        var isValidJSON = function(str) {
            if (str == '') return false;
            str = str.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
            return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
        }

        this.toJS = ko.computed(function() {
            var params = self.params(),
                len = params.length,
                i = 0,
                result = [];

            for(;i<len;i++) {
                var curr = params[i].toJS();

                if(!curr) {
                    continue;
                }

                result.push(curr);
            }
            return result;
        });

        this.toJSON = ko.computed({
            'read':function() {
                return JSON.stringify(self.toJS());
            },
            'write':function(val) {
                if(!isValidJSON(val)) {
                    return false;
                }

                var data = JSON.parse(val),
                    len = data.length,
                    i = 0,
                    result = [];

                if(!data || !len) {
                    return false;
                }

                for(;i<len;i++) {
                    var current = data[i];
                    var param = new paramConstructor();

                    param.type(current.type);
                    param.match(current.match);

                    if(current.pattern) {
                        param.pattern(current.pattern);
                    }
                    if(current.range) {
                        param.range[0](current.range[0]);
                        param.range[1](current.range[1]);
                    }
                    result.push(param);
                }
                self.params(result);
            },
            'deferEvaluation':true
        });

        function loadPreset(data) {
            var il = data.items.length,
                i = 0;

            for(;i<il;i++) {
                self.addParam(data.items[i]);
            }
            return true;
        }

        function findPreset(name) {
            var pl = _conf.presets.length,
                i = 0;

            for(;i<pl;i++) {
                var curr = _conf.presets[i];
                if(curr.name && curr.name == name) {
                    //found it
                    return loadPreset(curr);
                }
            }
            throw Error('Preset '+name+' couldn\'t be loaded');
        }

        //initialize
        if(!presetName || !_conf.presets) {
            self.addParam();
            return;
        }
        findPreset(presetName);
    }

    function fileSearchConfig() {
        var self = this;

        this.searches = ko.observableArray([]);

        this.searches.push(new fileSearchItem('Default'));

        this.addSearch = function() {
            self.searches.push(new fileSearchItem());
        }

        this.delSearch = function(item) {
            self.searches.remove(item);
        }

        this.reset = function() {
            self.filelist([]);
            self.searches([]);
            self.searches.push(new fileSearchItem('Default'));
        }

        this.toJSON = ko.computed(function() {
            //unfortunately searches cant be serialized immediately
            var allsearches = [],
                newsearch = self.searches(),
                nsl = newsearch.length,
                i = 0;

            for(;i<nsl;i++) {
                allsearches.push( newsearch[i].toJS() );
            }

            return {
                'depth':'infinity',
                'searches':allsearches
            };
        });
    }

    return function fileSearchViewModel(rootModel) {
        if(!rootModel) {throw Error('Have to specify root model')}
        var requestManager = rootModel.requestManager;

        var self = this;

        this.maximized = ko.observable(false);

        this.maximized.subscribe(function(val) {
            requestManager.abort();
            rootModel.navMode(!val);
        });
        this.postProcess = function(el) {
            jQuery('#search_pattern').delay(10).focus();
        }

        this.toggleMaximized = function() {
            self.maximized(!self.maximized());
        }

        this.config = new fileSearchConfig();

        this.running = ko.observable(false);

        this.startSearch = function () {
            self.running(true);
            return true;
        };

        requestManager.isRunning.subscribe(function(val) {
            if(!val && rootModel.queueManager.hasNoQueue() ) {
                self.running(false);
            }
        });

        this.running.subscribe(function(val) {
            if(!val) {
                requestManager.pauseScans();
            } else {
                if(requestManager.continueScans()) {
                    return true;
                }

                /*
                 * process the filelist provided by user
                 *
                 * TODO: This should be handled by a fileSearchItem
                 */

                var _searches = self.config.searches(),
                    _ns = _searches.length,
                    _scanningThisFolder = false,
                    j = 0;

                for(;j<_ns;j++) {
                    //queuelist and selection params handled separately

                    var search = _searches[j],
                        queue = [];

                    /*
                     * Use queuelist from search parameters
                     *
                     * TODO: this section needs some further thought.
                     * Backend should know which search to do on which
                     * set of todo/selection. Currently it is unaware
                     */

                    var queuelist = search.getFirstParam('queuelist');

                    if(queuelist) {
                        var actualList = queuelist.patternList();

                        var num = actualList.length,
                            i = 0,
                            prefix = rootModel.nav.inDocumentRoot() ? rootModel.rootFolderName()+'/' : '';

                        //correct the paths to un-hide the root folder name, when we're in document root

                        for(;i<num;i++) {
                            queue.push(Base64.encode(prefix+actualList[i]));
                        }
                    }

                    /*
                     * Use selection or not
                     */
                    var selectionParam = search.getFirstParam('selection');

                    if( !_scanningThisFolder && !queue.length && !selectionParam ) {

                        //if more than one search without todo-list or
                        // selection requested, only need to do the first
                        // one as backend already gets parameters
                        _scanningThisFolder = true;
                        queue.push( rootModel.nav.currentLocationBase64() );
                    } else if(selectionParam) {

                        var selectionInvert = selectionParam.match() === 'false';

                        rootModel.inodeLists().forEach(function(list) {
                            if(selectionInvert) {
                                list.view.paginatedItems().forEach(function(item) {
                                    if(selection.indexOf(item) === -1) {
                                        queue.push(item.b64path());
                                    }
                                });
                            } else {
                                list.view.selection().forEach(function(item) {
                                    queue.push(item.b64path());
                                });
                            }
                        });

                        //no more fallback to scan everything when trying to scan selection
                        if(!queue.length) {
                            rootModel.warning.push({'msg':'<b>Error:</b> You chose to scan selection, but did not seem to have made a selection'});
                        }
                    }

                    if(queue.length) {
                        //send search config and queue to queueManager
                        rootModel.queueManager.updateConfig(self.config.toJSON());
                        rootModel.queueManager.updateData({'queue':queue});
                    } else {
                        rootModel.warning.push({'msg':'<b>Error:</b> Cannot search, no search location specified'});
                    }
                }
            }
        });

        this.clearForm = function() {
            self.config.reset();
        }

        this.clearResults = function() {
            self.running(false);

            requestManager.abort();
            rootModel.queueManager.clear();
            rootModel.searchResult.view.clear();
        }
    }
}));
