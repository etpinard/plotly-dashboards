(function main() {

/* global d3:true */

var Plot = {
    id: 'plot',
    domainUrl: 'https://plot.ly',
    dataUrl: './raw/data.csv'
};

var Menus = {
    waferId: {
        colName: 'WAFER_ID',
        dflt: 'W26M'
    },
    deviceId: {
        colName: 'DEVICE_ID',
        dflt: 'A1'
    },
    paramName: {
        colName: 'PARAM_NAME',
        dflt: 'R0'
    }
};

var xColName = 'X',
    yCoName = 'Y',
    zColName = 'MEASUREMENT';

function fillArrayUnique(array, val) {
    if(array.indexOf(val) === -1) array.push(val);
}

Plot.iframe = document.getElementById(Plot.id);
Plot.graphContentWindow = Plot.iframe.contentWindow;

Plot.post = function post(o) {
    Plot.graphContentWindow.postMessage(o, Plot.domainUrl);
};

Plot.init = function init() {
    var pinger = setInterval(function() {
        Plot.post({task: 'ping'});
    }, 500);

    function messageListener(e) {
        var message = e.data;

        if(message.pong) {
            console.log('Initial pong, frame is ready to receive');
            clearInterval(pinger);

            d3.csv(Plot.dataUrl, function(dataRaw) {

                Plot.dataRaw = dataRaw;
                initMenus(dataRaw);
                Plot.draw({
                    waferId: Menus.waferId.dflt,
                    deviceId: Menus.deviceId.dflt,
                    paramName: Menus.paramName.dflt
                });

            });
        }
    }

    window.removeEventListener('message', messageListener);
    window.addEventListener('message', messageListener);
};

function initMenus(dataRaw) {
    var update = Plot.setUpdate();

    Object.keys(Menus).forEach(function(menu) {
        var $menu = document.getElementById(menu),
            options = [];
            
        dataRaw.forEach(function(p) {
            fillArrayUnique(options, p[Menus[menu].colName]);
        });

        options.forEach(function(option) {
            var $option = document.createElement('option');

            $option.text = option;
            $option.value = option;
            $menu.appendChild($option);

            $menu.addEventListener('change', update);
        });
    });
    
}

Plot.draw = function(specs) {
    var data = Plot.formatData(Plot.dataRaw, specs);

    Plot.post({
         task: 'newPlot',
         data: data,
         layout: {
            title: [
                '<b>Wafer ID</b>:', specs.waferId, '-',
                '<b>Device ID</b>:', specs.deviceId, '-',
                '<b>Param Name</b>:', specs.paramName
            ].join(' ')
         }
    });
};

Plot.formatData = function(dataRaw, specs) {

    // 1- start by filtered the data down to the selected specs
    var dataFilted = dataRaw.filter(function(p) {
       return (
           p[Menus.waferId.colName] === specs.waferId &&
           p[Menus.deviceId.colName] === specs.deviceId &&
           p[Menus.paramName.colName] === specs.paramName
       );
    });

    // 2- turn x, y, z into numbers
    dataFilted = dataFilted.map(function(p) {
        return {
            'x': +p[xColName], 
            'y': +p[yCoName],
            'z1d': +p[zColName]
        };
    });

    // 3- search for unique (x,y) coordinates
    var x = [],
        y = [];
    dataFilted.forEach(function(p) {
        fillArrayUnique(x, p.x);
        fillArrayUnique(y, p.y);
    });

    // 4- sort the (x,y) coordinates
    function sorter(a, b) { return a - b; }
    x.sort(sorter);
    y.sort(sorter);

    // 5- initialize z 2d array
    var nX = x.length,
        nY = y.length,
        z = new Array(nX);
    for(var i = 0; i < nX; i++) {
        z[i] = new Array(nY);
    }

    // 6- fill in z 2d array
    dataFilted.forEach(function(p) {
        z[x.indexOf(p.x)][y.indexOf(p.y)] = p.z1d;
    });

    // 7- return plotly data array
    return [
        {
            type: 'contour',
            transpose: true,  // nX x nY
            autocolorscale: true,
            x: x,
            y: y,
            z: z
        }
    ];
};

Plot.setUpdate = function() {
    var specs = {};

    return function() { 
        Object.keys(Menus).forEach(function(menu) {
            var $menu = document.getElementById(menu);
            specs[menu] = $menu.value;
        });
        Plot.draw(specs);
    };
};

Plot.init();

})();
