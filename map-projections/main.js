(function main() {

var Plot = {
    id: 'plot',
    domainUrl: 'https://plot.ly'
};

var Menus = {
    projType: {
        dflt: 'orthographic',
        options: [
            'equirectangular',
            'mercator',
            'orthographic',
            'natural earth',
            'kavrayskiy7',
            'miller',
            'robinson',
            'eckert4',
            'azimuthal equal area',
            'azimuthal equidistant',
            'conic equal area',
            'conic conformal',
            'conic equidistant',
            'gnomonic',
            'stereographic',
            'mollweide',
            'hammer',
            'transverse mercator'
        ]
    }
};

Plot.iframe = document.getElementById(Plot.id);
Plot.graphContentWindow = Plot.iframe.contentWindow;

Plot.post = function post(o) {
    Plot.graphContentWindow.postMessage(o, Plot.domainUrl);
};

function titleCase(s) {
    return s.charAt(0).toUpperCase() + s.substr(1);
}

Plot.init = function init() {
    var pinger = setInterval(function() {
        Plot.post({task: 'ping'});
    }, 500);

    function messageListener(e) {
        var message = e.data;

        if(message.pong) {
            console.log('Initial pong, frame is ready to receive');
            clearInterval(pinger);

            initMenus();
            Plot.draw({
                projType: Menus.projType.dflt
            });
        }
    }

    window.removeEventListener('message', messageListener);
    window.addEventListener('message', messageListener);
};

function initMenus() {
    var update = Plot.setUpdate();

    Object.keys(Menus).forEach(function(menu) {
        var $menu = document.getElementById(menu),
            options = Menus[menu].options;
            
        options.forEach(function(option) {
            var $option = document.createElement('option');

            $option.text = titleCase(option);
            $option.value = option;
            $menu.appendChild($option);

            $menu.addEventListener('change', update);
        });
    });
}

Plot.draw = function(specs) {
    Plot.post({
         task: 'newPlot',
         data: [{type: 'scattergeo'}],
         layout: {
             geo: {
                projection: {
                    type: specs.projType
                }
             }
         }
    });
};

Plot.setUpdate = function() {
    var specs = {};

    return function() { 
        Object.keys(Menus).forEach(function(menu) {
            var $menu = document.getElementById(menu);
            specs[menu] = $menu.value;
        });
        
        Plot.post({
            task: 'relayout',
            update: {
                geo: {
                    projection: {
                        type: specs.projType
                    }
                }   
            }
        });
    };
};

Plot.init();

})();
