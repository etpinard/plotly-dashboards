/* global Plotly:false */

(function () {

var data = [],
    dates = [],
    numMonths = 64 * 12,
    startYear = 1950,
    startMoney = 50000,
    wager = 200,
    payoff = 2,
    names = ['Alice', 'Bob', 'Charlie', 'Doug', 'Ethel',
        'Felice', 'Geoff', 'Helen', 'Ike', 'Jen', 'Kyle'],
    sliding = false,
    halfMonth = 1000 * 3600 * 24 * 15;

var y, i, j, yj, expectation;

var rangePlot = document.getElementById('rangeplot'),
    slider = document.getElementById('rangeslider'),
    sliderLabel = document.getElementById('rangelabel');

// some arbitrary 'gamble' function
function gamble(wager, payoff, expectation) {
    return 10 * (Math.random() - 0.5) * (wager + payoff - expectation);
}

for(i = 0; i < numMonths; i++) {
    dates.push(new Date(startYear, i));
}

for(i = 0; i < 11; i++) {
    y = [];
    yj = startMoney;
    expectation = (5 - i)/25;
    for(j = 0; j < numMonths && yj > 0; j++) {
        yj += gamble(wager, payoff, expectation);
        y.push(yj);
    }
    data.push({x: dates, y: y, name: names[i]});
}

var layout = {hovermode: 'closest'};

var plotDone = Plotly.plot(rangePlot, data, layout);

$(slider).slider({
    range: true,
    min: 0,
    max: numMonths - 1,
    values: [0, numMonths - 1],
    slide: function(event, ui) {
        var min = new Date(startYear, ui.values[0]).getTime(),
            max = new Date(startYear, ui.values[1]).getTime();
        sliding = true;
        Plotly.relayout(rangePlot, {'xaxis.range': [min, max]});
        sliding = false;
        setSliderLabel();
    }
});

function getMonth(millisecs) {
    var d = new Date(millisecs + halfMonth);
    return (d.getFullYear() - startYear) * 12 + d.getMonth();
}

function getMonthText(sliderval) {
    var month = sliderval % 12 + 1,
        year = Math.floor(sliderval / 12) + startYear;

    return month + '/' + year;
}

function setSliderLabel() {
    var vals = $(slider).slider('values');
    sliderLabel.textContent = getMonthText(vals[0]) + ' - ' +
                              getMonthText(vals[1]);
}

setSliderLabel();

$(rangePlot).on('plotly_relayout', function(event, eventdata) {
    if(sliding) return;
    var vals = $(slider).slider('values');

    if('xaxis.range[0]' in eventdata) {
        vals[0] = getMonth(eventdata['xaxis.range[0]']);
    }
    if('xaxis.range[1]' in eventdata) {
        vals[1] = getMonth(eventdata['xaxis.range[1]']);
    }
    if('xaxis.autorange' in eventdata) vals = [0, numMonths - 1];

    $(slider).slider('values', vals);
    setSliderLabel();
})
.on('plotly_click', function(event, eventdata) {
    var point = eventdata.points[0],
        traceColor = point.fullData.line.color,
        newAnnotation = {
            x: point.xaxis.d2l(point.x),
            y: point.yaxis.d2l(point.y),
            ax: 0,
            ay: -50,
            arrowhead: 6,
            bgcolor: 'rgba(255,255,255,0.75)',
            arrowcolor: traceColor,
            font: {color: traceColor},
            text: point.data.name + ': ' + point.y + ' on ' + point.x
        },
        newIndex = (rangePlot.layout.annotations || []).length;

    if(newIndex) {
        // trying to make another annotation on the same point?
        // delete instead
        var foundCopy = false;
        rangePlot.layout.annotations.forEach(function(ann, sameIndex) {
            if(ann.text === newAnnotation.text) {
                Plotly.relayout(rangePlot, 'annotations[' + sameIndex + ']', 'remove');
                foundCopy = true;
            }
        });
        if(foundCopy) return;
    }

    Plotly.relayout(rangePlot, 'annotations[' + newIndex + ']', newAnnotation);
})
.on('plotly_clickannotation', function(event, eventdata) {
    Plotly.relayout(rangePlot, 'annotations[' + eventdata.index + ']', 'remove');
});

return plotDone;

})();
