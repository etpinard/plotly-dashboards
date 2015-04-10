(function main() {

var Map = {id: '#map'},
    Plot = {id: '#plot'},
    activeState = d3.select(null);

Map.config = {
    width: 1000,
    height: 400,
    scale: 800,
    precision: 0.1,
    bgcolor: 'white',
    bordercolor: 'black',
    borderwidth: 1.5
};

queue()
    .defer(d3.json, "./raw/usa_110m.json")
    .defer(d3.csv, "./raw/income.csv")
    .defer(d3.json, "./raw/states_hash.json")
    .await(ready);

function ready(error, topo, income, states_hash) {

    if (error) return console.error(error);

    function calcdata() {
        var cd = {
            features: [],  // for d3
            trace: {}      // for plotly
        };

        var obj = topo.objects.subunits,
            features = topojson.feature(topo, obj).features,
            ids = obj.properties.ids;

        var incomeNames = income.map(function(d) {
            return d.States.toLowerCase();
        });

        var incomeMedian = income.map(function(d) {
            return d['Median income'];
        });

        var colorscale = d3.scale.linear()
            .domain([d3.min(incomeMedian), d3.max(incomeMedian)])
            .range(["#4575b4", "#ffffbf", "#a50026"]);

        features.forEach(function(feature) {
            var name = states_hash[feature.id].toLowerCase(),
                index = incomeNames.indexOf(name),
                d = income[index];

            feature.median = d['Median income'];
            feature.stderr = d['Standard error'];
            feature.name = feature.id;
            feature.fullname = d['States'];
            feature.fill = colorscale(feature.median);

        });

        features.sort(function compare(a, b) {
            if (a.median < b.median) return -1;
            if (a.median > b.median) return 1;
            return 0;
        });

        var trace = {
            median: [],
            stderr: [],
            name: [],
            fullname: [],
            fill: []
        };
        features.forEach(function(feature) {
            trace.median.push(feature.median);
            trace.stderr.push(feature.stderr);
            trace.name.push(feature.name);
            trace.fullname.push(feature.fullname);
            trace.fill.push(feature.fill);
        });

        cd.features = features;
        cd.trace = trace;

        return cd;
    }

    cd = calcdata();
    Plot.init(cd);
    Map.init(topo, cd);

}

Map.makeProjection = function makeProjection() {
    var config = Map.config;

    Map.projection = d3.geo.albersUsa()
        .scale(config.scale)
        .translate([config.width / 2, config.height / 2])
        .precision(config.precision);
};

Map.makePath = function makePath() {
    Map.path = d3.geo.path().projection(Map.projection);
};

Map.init = function init(topo, cd) {
    var config = Map.config,
        topoObjs = topo.objects,
        states = topojson.feature(topo, topoObjs.subunits),
        lakes = topojson.feature(topo, topoObjs.lakes);

    Map.makeProjection();
    Map.makePath();

    var svg = d3.select(Map.id)
        .append('svg')
        .attr("width", config.width)
        .attr("height", config.height);

    var formatter = d3.format('5s'),
        trace = cd.trace,
        fill = trace.fill;

    function handleClick(d) {
        var index = cd.trace.name.indexOf(d.name),
            activeFill = fill.map(function(i) { return i; });
        activeFill[index] = 'orange';

        Plot.post({
            'task': 'restyle',
            'update': {
                'marker.color': [activeFill]
            }
        });

        Plot.post({
            'task': 'relayout',
            'update': {
                title: d.fullname + ': ' + formatter(d3.round(d.median)),
                annotations: [{
                    xref: 'x',
                    x: d.name,
                    yref: 'y',
                    y: d.median,
                    yanchor:'bottom',
                    text: d.fullname,
                    ax: (index < 25) ? 40 : -40,
                    ay: -40,
                    font: {
                        size: 20,
                        color: 'orange'
                    }
                }]
            }
        });

        Plot.post({
            'task': 'redraw'
        });

        if (activeState.node() === this) return reset();
        activeState.classed("active", false);
        activeState = d3.select(this).classed("active", true);
    }

    function handleZoom() {
        Map.projection
            .translate(zoom.translate())
            .scale(zoom.scale());
        Map.drawPaths();
    }

    function reset() {
        activeState.classed("active", false);
        activeState = d3.select(null);

        d3.selectAll("path.state")
            .each(function(d) {
                d3.select(this).classed("active", false);
        });

        Plot.post({
            'task': 'restyle',
            'update': {
                'marker.color': [fill]
            }
        });

        Plot.post({
            'task': 'relayout',
            'update': {
                title: '',
                annotations: [{
                    'showarrow': false,
                    'text': ''
                 }]

            }
        });

        Plot.post({
            'task': 'redraw'
        });

        Map.makeProjection();
        Map.makePath();
        zoom.translate(Map.projection.translate());
        zoom.scale(Map.projection.scale());
        Map.drawPaths();
    }

    var scale = config.scale,
        zoom = d3.behavior.zoom()
            .translate([config.width / 2, config.height / 2])
            .scale(scale)
            .scaleExtent([0.5 * scale, 1000 * scale])
            .on("zoom", handleZoom);

    svg.append("g")
        .attr("class", "states")
      .selectAll("path")
        .data(cd.features)
      .enter().append("path")
        .attr("class", "state")
        .on("click", handleClick)
        .call(zoom)
        .on("dblclick.zoom", null)
        .on("dblclick", reset);

    svg.append("g")
        .attr("class", "lakes")
        .datum(lakes)
      .append("path")
        .attr("class", "lake")
        .attr("fill",  config.bgcolor)
        .attr("stroke", config.bordercolor)
        .attr("stroke-width", config.borderwidth);

    Map.drawPaths();
    Map.stylePaths();

};

Map.drawPaths = function drawPaths() {
    d3.selectAll("path")
        .attr("d", Map.path);
};

Map.stylePaths = function stylePaths() {
    var config = Map.config;

    d3.selectAll("path.state")
        .each(function(d) {
            var s = d3.select(this);
            s.attr("fill", function(d) { return d.fill; })
             .attr("stroke", config.bordercolor)
             .attr("stroke-width", config.borderwidth);
        });
};


Plot.init = function init(cd) {

    Plot.graphContentWindow = document.getElementById('plot-iframe').contentWindow;

    var pinger = setInterval(function() {
        Plot.post({task: 'ping'});
    }, 500);

    function messageListener(e) {
        var message = e.data;

        if (message.pong) {
            console.log('Initial pong, frame is ready to receive');
            clearInterval(pinger);
            Plot.draw(cd);
            Plot.post({
                'task': 'listen',
                'events': ['click']
            });
        }
        // TODO
//         else if (message.type === 'click') {
//             Plot.onClick(message);
//         }
    }

    window.removeEventListener('message', messageListener);
    window.addEventListener('message', messageListener);
};

Plot.post = function post(o) {
    Plot.graphContentWindow.postMessage(o, 'https://plot.ly');
};

Plot.draw = function draw(cd) {
    var trace = cd.trace;

    Plot.post({
         task: 'newPlot',
         data: [
            {
                type: 'bar',
                x: trace.name,
                y: trace.median,
                error_y: {
                   array: trace.stderr
                },
                text: trace.fullname,
                marker: {
                    color: trace.fill
                }
            }
         ],
         layout: {
            title: '',
            xaxis: {
                title: 'States',
                autorange: false,
                range:[-0.5, 51.5]
            },
            yaxis: {
                title: '2012-2013 Median household income<br>[in 2013 dollars]',
                autorange: false,
                range: [0, 79e3]
            }
         }
    });


};

Plot.onClick = function onClick(message) {
    var name = message.points[0].x;

    console.log(name)

    d3.selectAll("path.state")
        .each(function(d) {
            s = d3.select(this);
            if (d.id === name) s.classed("active", true);
            else s.classed("active", false);
        });

};

})();
