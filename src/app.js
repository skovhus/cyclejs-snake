import Cycle from '@cycle/core';
import {div, svg, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';
import requestAnimationFrame from 'raf';

const FPS = 60;
const SCALE = 2;
const MAP_SIZE = 500;

function drawWorld(state) {
    return svg('svg',
        {
            class: 'game-map' + (state.dead ? ' game-map--dead' : ''),
            width: MAP_SIZE * SCALE,
            height: MAP_SIZE * SCALE,
        },
        state.trail.map(t =>
            svg('rect', {
                class: 'snake',
                x: t[0] * SCALE,
                y: t[1] * SCALE,
                width: SCALE,
                height: SCALE,
            })
        )
    );
}

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
        const now = new Date();
        const fps = Math.round(1000 / (now - previousState.lastTick));

        const newTrail = previousState.trail;
        const newSnake = Object.assign({}, previousState.snake);
        let dead = false;

        if(keysState.direction === 'RIGHT') {
            newSnake.vx = previousState.snake.vy;
            newSnake.vy = -previousState.snake.vx;
        } else if(keysState.direction === 'LEFT') {
            newSnake.vx = -previousState.snake.vy;
            newSnake.vy = previousState.snake.vx;
        }
        newSnake.x += newSnake.vx;
        newSnake.y += newSnake.vy;

        if (newSnake.x < 0 || newSnake.y < 0 || newSnake.x > MAP_SIZE-1 || newSnake.y > MAP_SIZE-1 ) {
            // FIXME: kill the stream
            newSnake.vx = 0;
            newSnake.xy = 0;
            dead = true;
        } else {
            newTrail.push([newSnake.x, newSnake.y]);
        }

        return {
            dead: dead,
            fps: fps,
            lastTick: now,
            snake: newSnake,
            trail: newTrail,
        };
    }, {trail: [[20, 50]], snake: {x: 20, y: 50, vx: 1, vy: 0}, lastTick: new Date(), fps: 0});

    return {
        DOM: state$.map(state =>
            div([
                div({className: 'fps'}, 'FPS: ' + state.fps),
                drawWorld(state)
            ])
        )
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
