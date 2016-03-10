'use strict';

/* global Plotly:false */

(function() {

var d3 = Plotly.d3;

var gd = document.getElementById('graph');
var sd = document.getElementById('selector');

// var rawDataURL = 'https://raw.githubusercontent.com/plotly/datasets/master/2014_apple_stock.csv';
// var xField = 'AAPL_x';
// var yField = 'AAPL_y';

var rawDataURL = 'https://raw.githubusercontent.com/plotly/datasets/master/2016-weather-data-seattle.csv';
var xField = 'Date';
var yField = 'Mean_TemperatureC';

// only available for axes with `type: 'date'`
var selectorOptions = {
    visibile: true,
    
    // selectattribute: 'x', // (later)

    buttons: [{
        //type: 'step',  // or 'range' (later)
        step: 'month',
        stepmode: 'backward', // or 'forward', 'to day' (see YTD)
        count: 1,
        label: '1m'
    }, {
        step: 'month',
        stepmode: 'backward',
        count: 3,
        label: '3m'
    }, {
        step: 'month',
        stepmode: 'backward',
        count: 6,
        label: '6m'
    }, {
        step: 'year',
        stepmode: 'to day',
        count: 1,
        label: 'YTD'
    }, {
        step: 'year',
        stepmode: 'backward',
        count: 1,
        label: '1y'
    }, {
        step: 'all',  // or better name for this special case?
        label: 'reset'
    }],

    bgcolor: '',
    bordercolor: '',
    bordercolor: 1,

    len: 0.1,
    font: {},
    x: '',
    xanchor: '',
    y: '',
    yanchor: ''

};

d3.csv(rawDataURL, function(err, rawData) {
    if(err) throw err;

    var data = prepData(rawData);

    makePlot(data)

    makeSelector(selectorOptions, data);
});

function prepData(rawData) {
    var x = [];
    var y = [];

    rawData.forEach(function(datum) {
        x.push(new Date(datum[xField]));
        y.push(datum[yField]);
    });

    x = x.slice(0, x.length-31);

    return [{
        mode: 'lines',
        x: x,
        y: y
    }];
}

function makePlot(data) {
    var layout = {
        title: 'range selector prototype',
        yaxis: {
            fixedrange: true
        }
    }

    Plotly.plot(gd, data, layout)
}

function makeSelector(opts, data) {
    var svg = d3.select(sd).append('svg');

    var width1 = 50;
    var height1 = 40;

    svg.attr({
        x: 0,
        width: 400
    });

    svg.style({
        'pointer-events': 'all'
    });

    var buttons = svg.selectAll('g.button')
        .data(opts.buttons);

    buttons.enter().append('g')
        .classed('button', true);

    buttons.exit().remove();

    buttons.each(function(opts, index) {
        var button = d3.select(this);

        button.append('rect')
            .attr({
                x: width1 * (0.5 + index),
                width: width1,
                height: height1
            })
            .style({
                fill: 'none',
                stroke: '#000',
                'stroke-width': 2
            });

        button.append('text')
            .attr({
                x: width1 * (1 + index),
                y: height1 / 2,
                'text-anchor': 'middle'
            })
            .text(opts.label);

        button.on('click', function() {
            var update;

            if(opts.step === 'all') {
                update = { 
                    'xaxis.autorange': true, 
                    'xaxis.range': null 
                };
            }
            else {
                var xrange = getXRange(gd, opts); 

                update = {
                    'xaxis.range[0]': xrange[0],
                    'xaxis.range[1]': xrange[1]
                };
            }

            console.log(update)
            Plotly.relayout(gd, update);
        });
    });

}

function getXRange(gd, opts) {
    var currentRange = gd.layout.xaxis.range;
    var base = new Date(currentRange[1]);

    var range0, range1

    switch(opts.stepmode) {
        case 'backward':
            range1 = currentRange[1];
            range0 = d3.time[opts.step].offset(base, -opts.count).getTime();
            break;

        case 'to day':
            range1 = currentRange[1];
            range0 = d3.time[opts.step].floor(base).getTime();
            break;
    }

    return [range0, range1];
}

})();
