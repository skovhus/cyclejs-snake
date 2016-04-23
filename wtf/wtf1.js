import Cycle from '@cycle/core';
import {div, label, input, hr, h1, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';

function main(sources) {

    sources.Keydown.map(k => {
        // You would think should be logging, but it is not the case as nobody subscribes to
        // this event stream.
        console.log('>>>', k);
    });

    return {
        DOM: sources.Keydown
            // Instead you should inject a console "do" statement here:
            .do(k => console.log(k))
            .map(i => h1(i.code + ''))
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
});
