import Cycle from '@cycle/core';
import {div, label, input, span, h1, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';
import {makeAnimationDriver} from 'cycle-animation-driver';
import {range} from 'lodash';

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

    const keysState$ = areKeysDown$.map(areKeysDown => {
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

    const initialMap = Array(50).fill(0).map(() => Array(50).fill(0));
    const state$ = sources.animation.withLatestFrom(keysState$, (animationStuff, keysState) => {
        return { animationStuff, keysState };
    }).scan((previousState, {animationStuff, keysState}) => {
        const newMap = previousState.map;
        const newSnake = Object.assign({}, previousState.snake);
        if(keysState.direction === 'RIGHT') {
            newSnake.vx = previousState.snake.vy;
            newSnake.vy = -previousState.snake.vx;
        } else if(keysState.direction === 'LEFT') {
            newSnake.vx = -previousState.snake.vy;
            newSnake.vy = previousState.snake.vx;
        }
        console.log(keysState.direction, newSnake)
        newSnake.x += newSnake.vx;
        newSnake.y += newSnake.vy;
        newMap[newSnake.x][newSnake.y] = 1;
        return {
            map: newMap,
            snake: newSnake,
        };
    }, {map: initialMap, snake: {x: 7, y: 5, vx: 1, vy: 0}});

    return {
        DOM: state$.map(state => {
            return div(state.map.map(row => div(
                { className: 'row' },
                row.map(cell => div(
                    {
                        className: 'cell',
                        style: {
                            backgroundColor: cell ? 'black' : 'red'
                        }
                    },
                    ' '
                ))
            )))
        })
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
    animation: makeAnimationDriver(),
});
