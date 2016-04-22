import Cycle from '@cycle/core';
import {div, label, input, span, h1, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';

function main(sources) {
    const keyup$ = sources.Keyup
        .filter(e => e.code === 'ArrowLeft' || 'ArrowRight')
        .map(e => ({ key: e.code, type: 'UP' }));

    const keydown$ = sources.Keydown
        .filter(e => e.code === 'ArrowLeft' || 'ArrowRight')
        .map(e => {
            return { key: e.code, type: 'DOWN' }
        });

    const areKeysDown$ = Observable
        .merge(keyup$, keydown$)
        .scan((areKeysDown, currentEvent) => Object.assign({}, areKeysDown, {
            [currentEvent.key]: currentEvent.type === 'DOWN',
        }), {})
        .startWith({});

    const state$ = areKeysDown$.map(areKeysDown => {
        let direction = 'FORWARD';
        if(areKeysDown['ArrowLeft'] && !areKeysDown['ArrowRight']) {
            direction = 'LEFT';
        } else if(!areKeysDown['ArrowLeft'] && areKeysDown['ArrowRight']) {
            direction = 'RIGHT';
        }
        return {
            left: areKeysDown['ArrowLeft'],
            right: areKeysDown['ArrowRight'],
            direction
        };
    });

    return {
        DOM: state$.map(({left, right, direction}) =>
            div([
                div(span(`left: ${left}`)),
                div(span(`right: ${right}`)),
                div(span(`direction: ${direction}`)),
            ])
        )
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
