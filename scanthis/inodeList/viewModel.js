//viewModel for a collection of inodes
/*
 * Supports: filter, sort, paginate, select, focus
 *
 * Selected items can be managed like:
 * -change mode (chmod), sanitize or copy names
 * Focus is used for:
 * -keyboard navigation, selection management
 *
 */
(function (root, factory) {
    define(['knockout','inodeList/inode','bindingHandlers/knockout.pagination','bindingHandlers/knockout.selection','jQuery'], factory);
}(this,function(ko,Inode) {
    "use strict";

    return function listableContentView(rootModel,parentModel) {
        if(!rootModel) {throw Error('Have to specify root model')}
        if(!parentModel) {throw Error('Have to specify parent model')}

        //private vars
        var self = this,
            rawData = [],
            _sortItemCount = 0,
            _sortQuickReverse = true;

        //filter and sort - rawData > content
        this.nameFilter = ko.observable('');//filter
        this.sortCol = ko.observable('name');//default sort = name
        this.sortDir = ko.observable(1);//1=DESC,-1=ASC
        this.content = ko.observableArray([]);//holds items that pass filter

        //knockout.pagination - content > paginatedItems
        this.numItems = ko.observable(0);//holds number of items in rawData
        this.itemsPerPage = ko.observable(200);
        this.currentPage = ko.observable(0);
        this.pageLinks = ko.observableArray([]);//this is set separately
        this.paginatedItems = ko.observableArray([]);//holds paginated items

        //knockout.selection - paginatedItems > selection & focusedItem
        this.selection = ko.observableArray([]);
        this.focusedItem = ko.observable(null);

        //some extra observables which are intended to change the view
        this.visible = ko.observable(false);//possible to hide completely
        this.maximized = ko.observable(true);//or to only minimize
        this.hasFocus = ko.observable(false);//deprecated parameter indicating if this list has focus
        this.overlayListEnabled = ko.observable(false);//for showing textarea list of selected items
        this.freezeContent = ko.observable(false);//to disable navigation

        //this should be in the navigation module, not here!
        function getCrumbChild() {
            var crumbs = rootModel.nav.navCrumbs(),
                l = crumbs.length,
                i = l - 1,
                child = crumbs[i];

            for(;i >= 0;i--) {
                if(crumbs[i].selected) {
                    //previous item is parent
                    break;
                }
                child = crumbs[i];
            }
            return child.path.substr(1);
        }

        //add new items to collection
        this.handleNewItems = function(data) {
            if(self.freezeContent()) {return false}

            var len = 0;

            for(var i in data) {
                if(undefined != rawData['i'+parseInt(i)]) {
                    rawData['i'+parseInt(i)].update(data[i]);
                    continue;
                }
                rawData['i'+parseInt(i)] = new Inode(data[i]);
                rawData['i'+parseInt(i)].ino = 'i'+parseInt(i);

                len++;
            }

            self.numItems(self.numItems()+len);

            //if new items added to rawData, reload content
            if(len) {
                self.reloadContent();
            }
        };

        //reset collection content, but leave user preferences intact
        this.clear = function() {
            rawData = [];
            self.nameFilter('');//chose to override this user preference
            self.selection([]);
            self.focusedItem(null);
            self.content([]);
            self.numItems(0);
            self.currentPage(0);
        };

        //filtering
        this.setNameFilter = function(data,e) {
            if(e.keyCode == 27) {//esc key
                e.target.value = '';
            }
            self.nameFilter(e.target.value);
        };

        this.nameFilter.subscribe(function(val) {
            var n = false;//support negative searching by adding ! before the regex
            if(val.charAt(0) == '!') {
                val = val.substr(1);
                n = true;
            }
            var filter = new RegExp(val,'i');

            var origContent = self.content();
            var cl = origContent.length;

            var matched = [];
            //put data into indexed array
            for(var i in rawData) {
                //xor:
                if( (n ^ filter.test(rawData[i].name()) ) ) {
                    matched.push(rawData[i]);
                } else {
                    rawData[i].selected(false);
                }
            }

            if(matched.length != cl) {
                //warning: 2 redraws!
                self.content(matched);//1 redraw
                self.sortBy(self.sortCol(),self.sortDir());//1 redraw
                self.currentPage(0);
            }
        });

        //sorting
        this.sortBy = function(col,dir) {
            //could be an observable which only changes on _sortDir and sortCol
            var arrayReference = self.content();

            if(col=='type') {
                throw new Error('Not possible to sort by type');
            }

            //if already sorted by this column and array otherwise poses no issues, reverse
            //otherwise do a new sort
            if(self.sortCol() == col && arrayReference.length == _sortItemCount && _sortQuickReverse) {
                arrayReference.reverse();
            } else {

                _sortItemCount = self.content().length;
                _sortQuickReverse = true;

                if(parseInt(dir)) {
                    self.sortDir(dir);
                } else if(this.sortCol() == col) {
                    self.sortDir(self.sortDir()*-1);
                } else {
                    self.sortDir(-1);
                }
                self.sortCol(col);
                var _sortDir = self.sortDir();//extract before loop

                arrayReference.sort(function(l,r) {
                    if(l.type() == r.type()) {
                        return l[col]() < r[col]() ? -1*_sortDir : 1*_sortDir;
                    } else {
                        _sortQuickReverse = false;
                        return r.type() == 'file' ? -1 : 1;
                    }
                });
            }
            self.content.valueHasMutated();
        };

        this.reloadContent = function() {

            //reindex array so knockout can work it
            var filter = new RegExp(self.nameFilter(),'i');
            var simpleArray = [];
            for(var j in rawData) {
                if(filter.test(rawData[j].name())) {
                    simpleArray.push(rawData[j]);
                }
            }

            //we want to maintain the current sort
            self.content(simpleArray);
            self.sortBy(self.sortCol(),self.sortDir());
        }

        //focus/selection
        self.paginatedItems.subscribe(function(newItems) {
            //if not too many items, try to focus on folder recently visited
            if(newItems.length > 50 || !newItems.length ) {
                return;
            }

            var shouldHaveFocus = getCrumbChild(),
                nl = newItems.length,
                i = 0;

            for(;i < nl;i++) {
                if(newItems[i].b64path() == shouldHaveFocus) {
                    self.focusedItem(newItems[i]);
                    break;
                }
            }
            if(!self.focusedItem()) {
                self.focusedItem(newItems[0]);
            }

        });

        this.focusedItem.subscribe(function(item) {
            if(!item) {
                return;//I'm probably being unset
            }

            var itemOffset = jQuery('#'+item.ino).offset();

            if(!itemOffset) {
                return;//item not in DOM yet
            }

            self.hasFocus(true);

            //item in DOM, do the magic
            var itemTop = itemOffset.top,
                itemHeight = jQuery('#'+item.ino).height(),
                scrollTop = jQuery(window).scrollTop(),
                windowHeight = jQuery(window).height();

            if( itemTop < scrollTop ) {
                document.getElementById(item.ino).scrollIntoView(true);
            } else if( (itemTop + itemHeight ) > (scrollTop + windowHeight) ) {
                document.getElementById(item.ino).scrollIntoView(false);
            }
        });

        this.allSelected = ko.computed({
            'read' : function() {
                return self.selection().length && self.selection().length == self.paginatedItems().length;
            },
            'write': function(value) {
                var state = value === true;

                self.selection([]);

                if(state) {
                    var arrayReference = self.selection();

                    self.paginatedItems().forEach(function(item) {
                        arrayReference.push(item);
                    });
                    self.selection.valueHasMutated();
                }
                return state;
            }
        });

        this.selectedNonUTF8Items = ko.computed(function() {
            //pathenc_fail == requires sanitize (non-utf-8 characters)
            var items = self.selection();
            if(!items.length) {return false;}
            for(var i in items) {
                if(items[i].pathenc_fail()) {return true;}
            }
            return false;
        });

        this.hasSelectedFiles = ko.computed(function() {
            var items = self.selection();
            if(!items.length) {return false;}
            for(var i in items) {
                if(items[i].type()=='file') {return true;}
            }
            return false;
        });

        this.hasSelectedDirs = ko.computed(function() {
            var items = self.selection();
            if(!items.length) {return false;}
            for(var i in items) {
                if(items[i].type()=='dir') {return true;}
            }
            return false;
        });

        //deprecated - only copy dialog still uses it
        this.hasFocus.subscribe(function(val) {
            if(val) {
                rootModel.currentFocus(self);
            }
        });

        //to allow click events to toggle maximized state
        this.toggleMaximized = function() {
            self.maximized(!self.maximized());
        };

        //to provide list of selected items for copying to clipboard
        this.overlayListContent = ko.computed({
            'read': function() {
                var items = self.selection(),
                    result = '';

                for(var i in items) {
                    result += items[i].urlPath()+"\n";
                }
                return result;
            },
            'deferEvaluation':true
        });

        //filled by knockout.pagination - all pages have a link. If links
        // are to be ommitted, add a computed observable below

        /*this.pageLinks = ko.computed(function() {
            var curr = self.currentPage(),
                i = 0,
                ln = self.numPages(),
                items = [],
                tol = 1,
                hiding = false;
            var page = function(val,name,sel) {
                this.val = ko.observable(val);
                this.name = ko.observable(name);
                this.selected = ko.observable(curr == val);
            }

            for(;i < ln;i++) {
                //first 3,last 2,curr-2,curr+2. Max 10
                var near = Math.abs(curr-i);
                if(i <= tol || ln-i <= tol || near <= tol) {
                    items.push(new page(i,i+1));
                    hiding = false;
                } else {
                    if(!hiding) {
                        hiding = true;
                        items.push(new page(-1,'...'));
                    }
                }
            }
            return items;
        });*/
    }
}));