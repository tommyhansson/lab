(function (root, factory) {
    define(['knockout'], factory);
}(this,function(ko){
    ko.extenders.byteString = function(target){
        var sizes = ['B','kB','MB','GB','TB','PB','EB','ZB','YB'];

        target.bytes = ko.observable(0);

        var result = ko.computed({
            'read': function(){
                var val = target(),
                    i = Math.floor( Math.log(val) / Math.log(1024) );

                return val == 0 ? '' : Math.round( val/ Math.pow(1024,i),i>0 ? 2:0 )+ ' ' + sizes[i];
            },
            'write':function(newVal){
                var current = target(),
                    valueToWrite = 0;

                if(parseInt(newVal) == newVal){
                    valueToWrite = newVal;
                } else {
                    //text input. Try to validate with regex
                    var regex = new RegExp('^([0-9.,]+)([ ]+)?('+sizes.join('|')+')','i');
                    if(!regex.test(newVal)){
                        //input not understood. Ignore change
                        valueToWrite = current;
                    } else {
                        //do the matching
                        var matches = regex.exec(newVal),
                            value = parseInt(matches[1]),
                            str = matches[3],
                            num = sizes.length,
                            i = 0;
                        for(;i < num;i++){
                            var cur = new RegExp('^'+sizes[i]+'$','i');
                            if(cur.test(str)) break;
                        }
                        valueToWrite = value*Math.pow(1024,i);
                    }
                }

                if (valueToWrite !== current) {
                    target(valueToWrite);
                    target.bytes(valueToWrite);
                } else {
                    //if the rounded value is the same, but a different value was written, force a notification for the current field
                    if (newVal !== current) {
                        target.bytes.notifySubscribers(valueToWrite);
                        target.notifySubscribers(valueToWrite);
                    }
                }
            }
        });

        result(target());
        return result;
    }
}));