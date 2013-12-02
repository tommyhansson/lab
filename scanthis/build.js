({
    baseUrl: ".",
    name:'lib/almond',// < that is a small version of requirejs
    'paths':{
        'jQuery':'lib/jquery-1.9.1.min',
        'knockout':'lib/knockout-2.2.1',
        'less':'lib/less',
        'mousetrap':'lib/mousetrap',
        'Base64':'lib/Base64',
        'moment':'lib/moment.min'
    },
    include:'main',
    out: "main-built.js"
})
