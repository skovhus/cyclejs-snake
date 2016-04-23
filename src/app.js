import Cycle from '@cycle/core';
import {div, svg, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';
import requestAnimationFrame from 'raf';

const FPS = 30;
const SCALE = 2;
const MAP_SIZE = 250;
const INITAL_MAP = Array(MAP_SIZE).fill(0).map(() => Array(MAP_SIZE).fill(0));

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

    const animation$ = Observable.interval(1000 / FPS, requestAnimationFrame);

    const state$ = animation$.withLatestFrom(keysState$, (_animationTick, keysState) => {
        return keysState;
    })
    .scan((previousState, keysState) => {
        const newMap = previousState.map;
        const newSnake = Object.assign({}, previousState.snake);
        if(keysState.direction === 'RIGHT') {
            newSnake.vx = previousState.snake.vy;
            newSnake.vy = -previousState.snake.vx;
        } else if(keysState.direction === 'LEFT') {
            newSnake.vx = -previousState.snake.vy;
            newSnake.vy = previousState.snake.vx;
        }
        newSnake.x += newSnake.vx;
        newSnake.y += newSnake.vy;
        newMap[newSnake.x][newSnake.y] = 1;
        return {
            map: newMap,
            snake: newSnake,
        };
    }, {map: INITAL_MAP, snake: {x: 20, y: 50, vx: 1, vy: 0}});

    return {
        DOM: state$.map(state => {
            return svg('svg',
                {
                    class: 'game-map',
                    width: MAP_SIZE * SCALE,
                    height: MAP_SIZE * SCALE,
                },
                state.map.map((row, x) =>
                    row.map((cell, y) => {
                        // row.filter(cell => cell) would be nice, but we loose the "y" index
                        if (cell) {
                            return svg('rect', {
                                class: 'snake',
                                x: x * SCALE,
                                y: y * SCALE,
                                width: SCALE,
                                height: SCALE,
                            })
                        }
                    })
                )
            )
        })
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
