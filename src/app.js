import Cycle from '@cycle/core';
import {div, label, input, span, h1, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';


function main(sources) {

    const keydown$ = sources.Keydown
        .map(e => e.code);

    const keyup$ = sources.Keyup
        .map(e => e.code);

    return {
        DOM: Observable.of(
            div([
                div([
                    span('down: '),

                    keydown$
                        .map(i => span(i + '')),

                ]),
                div([
                    span('up: '),

                    keyup$
                        .map(i => span(i))
                ]),
            ])
        )
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
