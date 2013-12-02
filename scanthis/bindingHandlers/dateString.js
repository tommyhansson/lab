(function (root, factory) {
    define(['knockout','moment'], factory);
}(this,function(ko){
    ko.bindingHandlers.dateString = {
        init: function(element, valueAccessor) {
            // Get the current value of the current property we're bound to
            var val = ko.utils.unwrapObservable(valueAccessor()),
                result = '-';
            if(val > 0){
                result = new moment(val*1000).format('YYYY-MM-DD HH:mm:ss');
            }
            if('value' in element){
                element.value = result;
            } else {
                element.innerHTML = result;
            }
        }
    }
}));