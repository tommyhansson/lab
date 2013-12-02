//Config for requirejs and our own modules
//note: To use \ in JSON, escape it with an extra \. Example eval\\(
require.config({
    'paths':{
        'jQuery':'lib/jquery-1.9.1.min',
        'knockout':'lib/knockout-2.2.1.debug',
        'less':'lib/less',
        'mousetrap':'lib/mousetrap',
        'Base64':'lib/Base64',
        'moment':'lib/moment.min'
    },
    'config':{
        'mainViewModel':{
            'version':'2.3.0 RC1 (2013-04-29)',
            'rootFolderName':'httpd.www',
        },
        'search':{
            'presets':[
            {
                'name':'Default',
                'items':[
                    'filename','queuelist','mtime','size','content'
                ]
            },
            {
                'name':'Advanced',
                'items':[
                    'filename','filepath','queuelist','selection','mtime','size','mode','content','bom'
                ]
            },
            {
                'name':'Unsuspend',
                'items':[
                    'queuelist','content'
                ]
            }]
        },
        'search/param':{
            'default':'filename',
            'groups':
            [{
                'name':'Name/path [file]',
                'items':[
                {
                    'name':'filename',
                    'descr':'Name',
                    'pattern':true,
                    'presets':[{
                        'descr':'Common scripts',
                        'pattern':'\\.(php|ht|js|pl|py|sh)'
                    }]
                },
                {
                    'name':'filepath',
                    'descr':'Location/path',
                    'pattern':true,
                    'presets':[{
                        'descr':'Scripts in images folder',
                        'pattern':'images/*.\.(php|htaccess|js|pl|py|sh)'
                    }]
                }]
            },
            {
                'name':'Name/path [any]',
                //these should both be treated as todo data, not as parameters
                'items':[
                {
                    'name':'queuelist',
                    'descr':'List',
                    'pattern':true,
                    'patternlist':true,//not happy with implementation
                    'matchonly':true
                },
                {
                    'name':'selection',
                    'descr':'Selection'
                }]
            },
            {
                'name':'Properties',
                'items':[
                {
                    'name':'mtime',
                    'descr':'Last modified',
                    'range':true,
                    'rangeExtend':'dateTime',
                    'presets':[
                    {
                        'descr':'1 hour ago',
                        'range':[{hours:1},'']
                    },
                    {
                        'descr':'24 hours ago',
                        'range':[{days:1},'']
                    },
                    {
                        'descr':'1 week ago',
                        'range':[{weeks:1},'']
                    },
                    {
                        'descr':'1-2 weeks ago',
                        'range':[{weeks:2},{weeks:1}]
                    },
                    {
                        'descr':'1 month ago',
                        'range':[{months:1},'']
                    },
                    {
                        'descr':'1-2 months ago',
                        'range':[{months:2},{months:1}]
                    },
                    {
                        'descr':'1 year ago',
                        'range':[{years:1},'']
                    },
                    {
                        'descr':'1-2 years ago',
                        'range':[{years:2},{years:1}]
                    }]
                },
                {
                    'name':'size',
                    'descr':'Size',
                    'range':true,
                    'range-extend':'byteString',
                    'presets':[
                    {
                        'descr':'1 MB +',
                        'range':['1 MB','']
                    },
                    {
                        'descr':'10 MB +',
                        'range':['10 MB','']
                    },
                    {
                        'descr':'100 MB +',
                        'range':['100 MB','']
                    }]
                },
                {
                    'name':'mode',
                    'descr':'CHMOD',
                    'range':true,
                    'presets':[
                    {
                        'descr':'Editable over FTP',
                        'range':['600','']
                    },
                    {
                        'descr':'Higher than 644',
                        'range':['645','']
                    }]
                }]
            },
            {
                'name':'Content',
                'items':[
                {
                    'name':'content',
                    'descr':'Content',
                    'pattern':true,
                    'presets':[
                    {
                        'descr':'Common exploits',
                        'pattern':"move_uploaded_file|\\bcopy\\(\\b|\\beval\\b|\\/\\be\\b|gzinflate|base64_decode|str_rot13"
                    }]
                },
                /*{
                    'name':'version',
                    'descr':'Script version',
                    'pattern':true,
                    'range':true
                },*/
                {
                    'name':'bom',
                    'descr':'BOM check',
                    'matchonly':true
                }
                ]
            }]
        }
    }
});

require(['knockout','mainViewModel','mousetrap','jQuery'],
function (ko,mainViewModel,Mousetrap) {
    //start up the program
    var fileBrowserView = new mainViewModel();

    jQuery("input[type=text],textarea").focus(function() {
        //select content of input fields on focus
        this.select();
    });

    //mousetrap global keyboard shortcuts
    Mousetrap.bind({
        '/': function() {
            fileBrowserView.search.maximized(true);
            return false;
        },
        'up up down down left right left right b a': function() {
            document.body.className = document.body.className + ' april';
            return false;
        },
        '?': function() {
            fileBrowserView.showHelp(true);
            return false;
        },
        'esc': function(e) {
            e.target.blur();
            return false;
        },
//to deprecate/replace with ko event bindings - all below here:
        '* n': function() {
            fileBrowserView.currentFocus().allSelected(false);
            return false;
        },
        'h': function() {
            return fileBrowserView.nav.gotoParent();
        },
        'c': function() {
            return fileBrowserView.currentFocus().overlayListEnabled(true);
        },
        'l': function() {
            return fileBrowserView.nav.gotoChild();
        }
    });
    Mousetrap.stopCallback = function(e, element, combo) {
        // stop for input, select, and textarea
        var isfield = element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA';

        if(!isfield || element.type === 'checkbox' || combo === 'esc') {
            return;
        }

        return true;
    }

    //no comments
    var today = new Date();
    if(today.getMonth() === 3 && today.getDate() === 1) {
        document.body.className = document.body.className + ' april';
        Mousetrap.unbind('up up down down left right left right b a');
    }
    if( (today.getMonth() === 10 && today.getDate() === 24) ||
         (today.getDay() === 5 && today.getDate() === 13)
     ) {
        document.body.className = document.body.className + ' mac';
    }
});