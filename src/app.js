import Cycle from '@cycle/core';
import {div, label, input, span, h1, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';


function main(sources) {
    const keydown$ = sources.Keydown
        .map(e => e.code);

    const keyup$ = sources.Keyup
        .map(e => e.code);

    const state$ = Observable.combineLatest(
        keydown$,
        keyup$,
        (down, up) => {
            return { up, down };
        }
    ).startWith({ up: 'none', down: 'none' });

    return {
        DOM: state$.map(({ up, down }) =>
            div([
                div(`down: ${down}`),
                div(`up: ${up}`),
            ])
        )
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
