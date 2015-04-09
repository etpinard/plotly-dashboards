(function main() {

    var plot = window.plot = {};

    plot.graphContentWindow = document.getElementById('plot-iframe').contentWindow;
    plot.traces = [];

    function messageListener(e) {
        var message = e.data;

        if (message.pong) {
            console.log('Initial pong, frame is ready to receive');
            clearInterval(plot.pinger);
            plot.onPong();
        }
        else if (message.type === 'click') {
            plot.onClick(message);
        }
        else if (message.task === 'getAttributes') plot.fig = message.response;

    }

    function post(o) {
        var plotlyDomain = 'https://plot.ly';
        plot.graphContentWindow.postMessage(o, plotlyDomain);
    }

    plot.pinger = setInterval(function() {
        post({task: 'ping'});
    }, 500);

    plot.onPong = function(message) {
        post({'task': 'getAttributes'});
        post({
            'task': 'listen',
            'events': ['click']
        });
    };

    plot.onClick = function(message) {
        var d = plot.fig.data[0],
            yi = message.points[0].pointNumber[0],
            xi = message.points[0].pointNumber[1];

        var t = d.x,
            v = d.z[yi],
            n = d.y[yi];

        if (plot.traces.indexOf(n)===-1) {
            post({
                'task': 'addTraces',
                'traces': [
                    {
                        x: t,
                        y: v,
                        name: n,
                        yaxis: 'y2'
                    }
                ],
                'newIndices': 1
            });
        }

        var anns = plot.fig.layout.annotations;
        anns[3] = {
            showarrow: false,
            xref: 'x',
            x: xi,
            yref: 'paper',
            y: 0,
            yanchor:'top',
            text: t[xi]
        };

        post({
            'task': 'relayout',
            'update': {
                shapes: [
                    {
                        type: 'line',
                        xref: 'x',
                        x0: xi,
                        x1: xi,
                        yref: 'paper',
                        y0: 0,
                        y1: 0.35,
                        line: {
                            dash: 'dash',
                            width: 3
                        },
                        opacity: 0.5
                    }
                ],
                annotations: anns
            }
        });

        plot.traces.push(n);
    };

    window.removeEventListener('message', messageListener);
    window.addEventListener('message', messageListener);

})();
