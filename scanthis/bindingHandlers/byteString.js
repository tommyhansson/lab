(function (root, factory) {
    define(['knockout'], factory);
}(this,function(ko) {
    ko.bindingHandlers.byteString = {
        init: function(element, valueAccessor) {
            // Get the current value of the current property we're bound to
            var value = ko.utils.unwrapObservable(valueAccessor()),
                result = '0 B';
            if(value < 0) {
                result = '-';
            } else  if(value > 0) {
                var sizes = ['B','kB','MB','GB','TB','PB','EB','ZB','YB'],
                    i = Math.floor( Math.log(value) / Math.log(1024) );
                result =  Math.round( value / Math.pow(1024,i),i>0 ? 2:0 ) + ' '+sizes[i];
            }

            if('value' in element) {
                element.value = result;
            } else {
                element.innerHTML = result;
            }
        }
    }
}));