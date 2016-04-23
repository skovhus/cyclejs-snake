import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';
import requestAnimationFrame from 'raf';

import getArc from './getArc';
import getSvgPath from './getSvgPath';

const FPS = 60;
const SCALE = 1; // FIXME
const MAP_SIZE = 500;

const STEP = 1;
const CURVE_RADIUS = 30;

const DIRECTION_RIGHT = 1;
const DIRECTION_LEFT = -1;
const DIRECTION_FORWARD = 0;

function drawWorld(state) {
    return h('svg',
        {
            attrs: {
                class: 'game-map' + (state.dead ? ' game-map--dead' : ''),
                width: MAP_SIZE * SCALE,
                height: MAP_SIZE * SCALE,
            }
        },
        state.trail.map(pathD =>
            h('path', {
                attrs: {
                    d: pathD,
                    class: 'snake',
                }
            })
        )
    );
}

function intent(Keyup, Keydown) {
    const keyup$ = Keyup
        .filter(e => e.code === 'ArrowLeft' || 'ArrowRight')
        .map(e => ({ key: e.code, type: 'UP' }));

    const keydown$ = Keydown
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
        let direction = DIRECTION_FORWARD;
        if(areKeysDown['ArrowLeft'] && !areKeysDown['ArrowRight']) {
            direction = DIRECTION_LEFT;
        } else if(!areKeysDown['ArrowLeft'] && areKeysDown['ArrowRight']) {
            direction = DIRECTION_RIGHT;
        }
        return {
            left: areKeysDown['ArrowLeft'],
            right: areKeysDown['ArrowRight'],
            direction
        };
    });

    const animation$ = Observable.interval(1000 / FPS, requestAnimationFrame);

    return {
        animation$, keysState$
    }
}

function model(animation$, keysState$) {
    return animation$.withLatestFrom(keysState$, (_animationTick, keysState) => {
        return keysState;
    })
    .scan((previousState, keysState) => {
        const now = new Date();
        const fps = Math.round(1000 / (now - previousState.lastTick) / 5 ) * 5;

        const currentSnake = previousState.snake;
        const newTrail = previousState.trail;
        const newSnake = Object.assign({}, previousState.snake);
        const snakePoint = {x: newSnake.x, y: newSnake.y};

        let pathD;
        let dead = false;

        if(keysState.direction === DIRECTION_FORWARD) {
            newSnake.x = currentSnake.x + currentSnake.vx * STEP;
            newSnake.y = currentSnake.y + currentSnake.vy * STEP;
            pathD = `M ${currentSnake.x} ${currentSnake.y} A 0 0 0 0 0 ${newSnake.x} ${newSnake.y}`;
        } else {
            // Turn
            const velocity = {
                x: newSnake.vx,
                y: newSnake.vy
            };

            const arc = getArc(CURVE_RADIUS, STEP, keysState.direction, velocity, snakePoint);
            pathD = getSvgPath(CURVE_RADIUS, currentSnake, arc.Pa, arc.startAngle, arc.endAngle);

            newSnake.x = arc.Pa.x;
            newSnake.y = arc.Pa.y;
            newSnake.vx = arc.Va.x;
            newSnake.vy = arc.Va.y;
        }

        if (newSnake.x < 0 || newSnake.y < 0 || newSnake.x > MAP_SIZE || newSnake.y > MAP_SIZE ) {
            dead = true;
        } else {
            newTrail.push(pathD);
        }

        return {
            dead: dead,
            fps: fps,
            lastTick: now,
            snake: newSnake,
            trail: newTrail,
        };
    }, {trail: [], snake: {x: 100, y: 100, vx: 1, vy: 0}, lastTick: new Date(), fps: 0});
}

function main(sources) {
    const {animation$, keysState$} = intent(sources.Keyup, sources.Keydown);

    const state$ = model(animation$, keysState$);

    return {
        DOM: state$.map(state =>
            h('div', [
                h('div', {props: {className: 'fps'}}, 'FPS: ' + state.fps),
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
