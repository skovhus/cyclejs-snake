import Cycle from '@cycle/core';
import {div, label, input, hr, h1, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';

function main(sources) {

    sources.Keydown.map(k => {
        // Why is this not logging:
        console.log('>>>', k);
    })

    return {
        DOM: sources.Keydown
            .map(i => h1('' + i + ' seconds elapsed'))
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
});
