/*global ko*/
/*
//minimal:
data-bind="pagination: { data: <observableArray>, pages: <observableArray>, currentPage: {data: <observableArray>, index: <observable> } }"
*
data-bind="pagination: { data: <observableArray>, pages: <observableArray>, itemsPerPage: <observable>, currentPage: {data: <observableArray>, index: <observable> } }"
*
* TODOs: Optimize behaviour, so redraws happen as few times as possible
*/
(function (root, factory) {
    define(['knockout'], factory);
}(this,function(ko) {

    ko.bindingHandlers.pagination = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = valueAccessor(),
                bindingValue = ko.utils.unwrapObservable(valueAccessor()),
                allBindings = allBindingsAccessor(),
                collection = null,
                itemsPerPage = null,
                pageData = null,
                pageIndex = null,
                pages = null;

            var timer = false;
            var delayedCallback = function(callback,delay) {
                if(timer) {
                    window.clearTimeout(timer);
                    timer = false;
                }
                timer = window.setTimeout(callback,delay || 10);
            }

            if (bindingValue.data) {
                collection = bindingValue.data;
                itemsPerPage = bindingValue.itemsPerPage || ko.observable(200);
            }

            if(bindingValue.currentPage) {
                pageData = bindingValue.currentPage.data || null;
                pageIndex = bindingValue.currentPage.index || null;
            }

            if(bindingValue.pages) {
                pages = bindingValue.pages;
            }

            if (!ko.isObservable(collection)) {
                throw new Error('The pagination binding should be bound to an object containing a `data` `observableArray`.');
            }

            if (!ko.isObservable(pages)) {
                throw new Error('The pagination binding should be bound to an object containing a `pages` `observableArray`.');
            }

            if (!ko.isObservable(pageData)) {
                throw new Error('The pagination binding should be bound to an object containing a `currentPage`.`data` `observableArray`.');
            }

            if (!ko.isObservable(pageIndex)) {
                throw new Error('The pagination binding should be bound to an object containing a `currentPage`.`index` `observable`.');
            }

            function getPages() {
                //data for view, so view can alter currentPage.index
                //depends on collection, itemsPerPage
                var total = collection().length,
                    n = parseInt(itemsPerPage()),
                    numPages = Math.ceil( total / n ) || 1,
                    currentIndex = pageIndex()
                    i = 0,
                    result = [];

                //hack for resetting pageIndex if needed:
                if(currentIndex > numPages) {
                    pageIndex(0);
                    return;
                }

                var page = function(ix) {
                    this.index = ko.observable(ix);
                    this.descr = ko.observable(ix+1);
                    this.selected = ko.observable(ix == currentIndex);

                    //immediately calculate the range as well
                    this.first = ko.observable(ix * n);
                    this.last  = ko.observable( (ix+1) * n );
                    if(this.last() > total) {
                        this.last(total);
                    }
                };

                for(;i < numPages;i++) {
                    result.push(new page(i));
                }

                //return result
                return result;
            }

            function getPageData() {
                //depends on collection, pages, currentPage.index
                var currPage = pageIndex(),
                    allItems = collection(),
                    pageList = pages(),
                    result = [];

                if(!pageList[currPage]) {
                    throw new Error('Unavailable page with index `'+currPage+'`chosen');
                }

                result = allItems.slice( pageList[currPage].first(), pageList[currPage].last() );

                return result;
            }

            //hard subscriptions, so we can limit redraws to a minimum
            collection.subscribe(function() {
                delayedCallback(function() {
                    pages( getPages() );
                    pageData ( getPageData() );
                });
            });

            itemsPerPage.subscribe(function() {
                //this changes the number of pages and the content of current page
                delayedCallback(function() {
                    pages ( getPages() );
                    pageData ( getPageData() );
                });
            });

            pageIndex.subscribe(function (index) {
                pages()[index].selected(false);
            }, this, 'beforeChange');

            pageIndex.subscribe(function(index) {
                pages()[index].selected(true);
                //this changes only content of current page
                delayedCallback(function() {
                    pageData ( getPageData() );
                });
            });
        }
    };
}));