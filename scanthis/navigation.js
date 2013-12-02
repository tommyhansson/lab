(function (root, factory) {
    define(['knockout','Base64','ajaxRequest'], factory);
}(this,function(ko,Base64,ajaxRequest) {
    "use strict";
    return function navigationViewModel(rootModel) {
        if(!rootModel) {throw Error('Have to specify root model')}

        var self = this;
        var deepestCrumb = '';

        this.showSimplePath = ko.observable(false);

        this.currentLocationBase64 = ko.observable(false);

        this.navCrumbs = ko.observableArray([]);

        //might be useful to have this accessible
        this.inDocumentRoot = ko.observable(false);

        function getDirContent(dataCallback) {
            var rq = new ajaxRequest({'data':self.currentLocationBase64(),'config':{'mode':'propfind','depth':1}},dataCallback);
            return rq;
        }

        this.currentLocation = ko.computed({
            'read':function() {
                var curr = self.currentLocationBase64(),
                    path = '';
                if(curr) {
                    curr = Base64.decode(curr);
                    if(curr.charAt(0) != '/') {path += '/';}
                    path += curr;
                }

                if(path.charAt(path.length-1) != '/') {
                    path += '/';
                }
                return path;
            },
            'write':function(val) {
                //http://www.unicode.org/reports/tr18/#Line_Boundaries
                self.currentLocationBase64(Base64.encode(val));
            },
            'deferEvaluation':true
        });

        this.currentLocationDisplay = ko.computed({
            'read':function() {
                var curr = self.currentLocation();
                var regex = new RegExp('^/'+rootModel.rootFolderName(),'');
                if(curr.match(regex)) {
                    return curr.replace(regex,'');
                } else return curr;
            },
            'write':function(val) {
                var curr = self.currentLocation();
                var regex = new RegExp('^/'+rootModel.rootFolderName(),'');
                var path = '';
                if(curr.match(regex)) {
                    path += rootModel.rootFolderName();
                }

                if(val.length > 0) {
                    if(val.charAt(0) != '/') {path += '/';}
                    path += val;
                }

                if(path.charAt(path.length-1) != '/') {
                    path += '/';
                }
                window.location.hash = Base64.encode(path);
            },
            'deferEvaluation':true
        });

        this.breadCrumbsNav = ko.computed(function() {
            var b64path = self.currentLocationBase64();
            var curr = self.currentLocation();
            //var display = self.currentLocationDisplay();

            var n = curr.indexOf(rootModel.rootFolderName());
            var crumbs = [];

            var inDocumentRoot = n >= 0 && n < 2;

            var crumb = function(name,path,fullPath) {
                this.name = name;
                this.path = path;
                this.selected = '#'+b64path == path;

                //extra fun for hiding part of path
                //NOTE: Functionality to check folder above document_root depends on this!
                if(inDocumentRoot && rootModel.rootFolderName() == fullPath) {
                    this.name = '/';
                }
                this.visible = (inDocumentRoot && name == '/') ? false : true;
            }

            if(curr == false && !deepestCrumb.length) {
                return [new crumb('/','#','/')];
            }
            var loc = curr;

            var hl = curr.length;
            if(hl > deepestCrumb.length || deepestCrumb.substring(0,hl) != curr) {
                deepestCrumb = curr;
            } else {
                loc = deepestCrumb;
            }

            crumbs.push(new crumb('/','#','/'));
            var items = loc.split('/'),
                i = 0,
                l = items.length,
                fullPath = '';

            for(;i < l;i++) {
                if( !items[i].length ) {
                    continue;
                }
                fullPath += items[i];

                crumbs.push(new crumb(items[i],'#'+Base64.encode(fullPath),fullPath));
                fullPath += '/';
            }

            self.navCrumbs(crumbs);
            self.inDocumentRoot(inDocumentRoot);
            return crumbs;
        });

        this.currentLocationBase64.subscribe(function(val) {
            if(!rootModel.navMode()) {return false;}

            if(rootModel.hasFatalError()) {return false;}

            //re-init dirs and files
            rootModel.requestManager.abort();
            rootModel.queueManager.clear();
            rootModel.inodeLists()[0].view.clear();
            rootModel.inodeLists()[1].view.clear();

            //get content
            rootModel.requestManager.schedule(getDirContent);
        });

        //function for going to parent folder
        this.gotoParent = function() {
            if(!rootModel.navMode()) {
                return null;
            }

            var crumbs = self.navCrumbs(),
                l = crumbs.length,
                parent = crumbs[0];

            if(crumbs.length == 1) {
                return;
            }

            var i = 0;
            for(;i<l;i++) {
                if(crumbs[i].selected) {
                    //found you, previous item is parent
                    break;
                }
                parent = crumbs[i];
            }
            window.location.hash = parent.path.substr(1);
            return true;
        }

        //function for going to child folder
        this.gotoChild = function() {
            if(!rootModel.navMode()) {
                return null;
            }

            var crumbs = self.navCrumbs(),
                l = crumbs.length,
                child = crumbs[l-1],
                focusedDir = rootModel.inodeLists()[0].view.focusedItem(),
                focusedFile = rootModel.inodeLists()[1].view.focusedItem();

            if(focusedDir != null) {
                window.location.hash = focusedDir.b64path();
                return true;
            } else if(focusedFile !== null) {
                return false;
            }

            //try breadcrumbs
            var i = l-1;
            for(;i >= 0;i--) {
                if(crumbs[i].selected) {
                    //found you, previous item is parent
                    break;
                }
                child = crumbs[i];
            }
            window.location.hash = child.path.substr(1);
            return true;
        }

        this.toggleSimplePath = function(data,e) {
            if(!rootModel.navMode()) {return false;}
            self.showSimplePath(!self.showSimplePath());
        }
        //init AFTER the workspace is prepared
        var hash = window.location.href.split('#')[1] || Base64.encode(rootModel.rootFolderName());
        this.currentLocationBase64(decodeURIComponent(hash));
    }
}));