/*
 * The search parameter object. Notes:
 * -Add presets in the config if it could be useful
 * -If preset data should be passed through a function to get into the
 *  correct format, try using ko.extenders for that rather than hardcoding
 *  it in here.
 *
 * Main TODOs:
 * -support lists in a cleaner way
 * -extending the range and pattern observables where needed
 *  (to be set in config)
 */
(function (root, factory) {
    define(['module','knockout','moment','jQuery','extenders/byteString'], factory);
}(this,function(module,ko,moment) {

    var validate_regex = function(pattern) {
        var grep;
        try{
            grep = new RegExp('('+pattern+')','igm');
        } catch(e) {
            alert("It is not possible to search for '"+pattern+"'.\nPlease remove any special characters, or use a valid regular expression.\n\nError message: "+e);
            return false;
        }
        return true;
    }

    return function searchParam() {
        var self = this;
        var _conf = module.config();

        //can be set for any parameter:
        this.type = ko.observable('');
        this.typeGroups = _conf.groups;

        this.preset = ko.observable('advanced');
        this.presetOptions = ko.observableArray([]);

        this.match = ko.observable('true');
        this.pattern = ko.observable('');

        this.patternList = ko.observableArray([]);

        this.range = [ko.observable(''),ko.observable('')];

        this.hasRange = ko.observable(true);
        this.hasPattern = ko.observable(true);
        this.hasPatternList = ko.observable(false);
        this.allowSetMatch = ko.observable(true);

        this.formattedPatternlist = ko.computed({
            'read':function() {
                return self.patternList().join('\n');
            },
            'write':function(val) {
                //http://www.unicode.org/reports/tr18/#Line_Boundaries
                var items = val.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
                //filter+sort+uniq them
                self.patternList(jQuery.unique(items.filter(function(e) {
                    return e.length>2;
                }).sort()));
            },
            'deferEvaluation':true
        });

        this.includeStr = ko.computed(function() {
            var _r = self.hasRange(),
                _p = self.hasPattern();
            if(_p) {
                return 'matches';
            } else if(_r && !_p) {
                return 'is';
            } else if(!_r && !_p) {
                return 'included';
            }
        });

        this.excludeStr = ko.computed(function() {
            var _r = self.hasRange(),
                _p = self.hasPattern();
            if(_p) {
                return "doesn't match";
            } else if(_r && !_p) {
                return 'is not';
            } else if(!_r && !_p) {
                return 'excluded';
            }
        });

        function updateConfig(data) {
            //handle presets + set value to default
            var presets = [];
            if(data.presets && data.presets.length) {
                presets = data.presets;
            }
            self.presetOptions(presets);

            /*
             * Figure out how to do this - current idea is wrong:
             * switch(self.type()) {
                case 'size':
                    self.range[0].extend({'byteString':true});
                break;
                default:
                break;
            }*/

            //handle visibility of form fields
            self.hasPattern(data.pattern || false);
            self.hasRange(data.range || false);
            self.hasPatternList(data.patternlist || false);
            self.allowSetMatch( !data.matchonly );

            //reset other form fields
            return reset();
        }

        this.toJS = function() {
            //just make an object whether we need it or not, saves ko calls
            // backend should check if pattern and/or range are to be ignored
            var result = {
                'type':self.type(),
                'pattern':self.pattern(),
                'patternlist':self.patternList(),
                'range':[self.range[0](),self.range[1]()],
                'match':self.match()
            };
            var _p = self.hasPattern(),
                _pl = self.hasPatternList(),
                _r = self.hasRange();

            //ugly hack. See if this can be done differently
            if(_p) {// && !result.pattern) {
                // a pattern is required
                if(_pl && !result.patternlist.length) {
                    //pattern list required but empty
                    return;
                }

                if(!_pl && !result.pattern) {
                    //pattern required but empty, no list required
                    return;
                }
            }

            if(_r && ( !result.range[0] && !result.range[1]) ) {
                // one or both result fields need to be filled out
                return;
            }

            return result;
        }

        //return used for self.type.subscribe to catch any init failure
        function reset() {
            self.match('true');
            self.pattern('');
            self.patternList([]);
            self.range[0]('');
            self.range[1]('');
            self.preset(null);
            return true;
        }

        //validate if the pattern is valid regex
        this.pattern.subscribe(function() {
            if( !validate_regex(self.pattern()) ) {
                self.pattern('');
            }
        });

        this.type.subscribe(function(val) {
            var gl = _conf.groups.length,
                i = 0;

            //loop over all groups
            for(;i<gl;i++) {
                if(! _conf.groups[i].items ) {
                    throw Error("No items in group "+i);
                }
                var curr = _conf.groups[i].items,
                    il = curr.length,
                    j = 0;

                //loop over all items
                for(;j<il;j++) {
                    if(curr[j].name && curr[j].name == val) {
                        return updateConfig(curr[j]);
                    }
                }
            }
            throw Error('Search parameter `'+val+'` not properly configured');
        });

        this.preset.subscribe(function(data) {
            if( !data || !data.descr ) {
                //do nothing, I'm probably being reset
                return;
            }
            self.preset(null);

            if(data.pattern && self.hasPattern()) {
                self.pattern(data.pattern);
            }

            if(data.range && data.range.length == 2 && self.hasRange()) {
                //TODO: Let the extenders automatically convert values
                // to proper format
                var range_min = data.range[0];
                var range_max = data.range[1];
                switch(self.type()) {
                    case 'mtime':
                        var min = new moment().utc(),
                            max = new moment().utc();

                        if(range_min) {
                            range_min = min.subtract(range_min).format('YYYY-MM-DD HH:mm:ss');
                        }
                        if(range_max) {
                            range_max = max.subtract(range_max).format('YYYY-MM-DD HH:mm:ss');
                        }
                    break;
                }
                self.range[0](range_min);
                self.range[1](range_max);
            }
        });

        //init empty search parameter of requested type (or default)
        this.type(_conf.default);
    }
}));