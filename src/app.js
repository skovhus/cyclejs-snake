import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {Observable} from 'rx';
import requestAnimationFrame from 'raf';

import getArc from './getArc';
import getSvgPath from './getSvgPath';

const FPS = 60;
const SCALE = 1; // FIXME
const MAP_SIZE = 800;

const STEP = 3;
const CURVE_RADIUS = 40;

const DIRECTION_RIGHT = -1;
const DIRECTION_LEFT = 1;
const DIRECTION_FORWARD = 0;

const BONUS_LIFE = 4000;

const COLLISION_THRESHOLD = 2.3; // Higher report false positives

const getRandomInt = (min, max) => Math.floor(Math.random()*(max-min+1)+min);
const getRandomSign = () => Math.random() > 0.5 ? 1 : -1;

const SNAKES_DATA = [
    {
        name: 'maciej',
        color: 'red',
        keys: {
            left: 'ArrowLeft',
            right: 'ArrowRight',
        }
    },
    {
        name: 'kenneth',
        color: 'yellow',
        keys: {
            left: 'KeyS',
            right: 'KeyD',
        }
    }
];

function drawWorld(state) {
    const snakes = state.snakes.map(snake =>
        h('path', {
            attrs: {
                d: snake.trail.join(' '),
                style: `stroke: ${snake.color}`,
                class: 'snake',
            }
        })
    );
    const bonuses = state.bonuses.map(bonus => h('circle', {
        attrs: {
            cx: bonus.x,
            cy: bonus.y,
            r: '10',
            stroke: 'limegreen',
            fill: 'limegreen'
        }
    }));
    return h('svg',
        {
            attrs: {
                class: 'game-map',
                width: MAP_SIZE * SCALE,
                height: MAP_SIZE * SCALE,
            }
        },
        snakes.concat(bonuses),
    );
}

function randomStartState(mapWidth, mapHeight) {
    const Vx = getRandomSign() * Math.random();
    const Vy = getRandomSign() * Math.sqrt(1 - Vx*Vx);
    const startpoint = {
        x: getRandomInt(mapWidth/3, 2*mapWidth/3),
        y: getRandomInt(mapHeight/3, 2*mapHeight/3),
        vx: Vx,
        vy: Vy,
    };
    return startpoint;
}

function intent(Keyup, Keydown) {
    const snakesDirections = SNAKES_DATA.map(snake => {
        const keyup$ = Keyup
            .filter(e => e.code === snake.keys.left || snake.keys.right)
            .map(e => ({ key: e.code, type: 'UP' }));
        const keydown$ = Keydown
            .filter(e => e.code === snake.keys.left || snake.keys.right)
            .map(e => {
                return { key: e.code, type: 'DOWN' }
            });

        const areKeysDown$ = Observable
            .merge(keyup$, keydown$)
            .scan((areKeysDown, currentEvent) => Object.assign({}, areKeysDown, {
                [currentEvent.key]: currentEvent.type === 'DOWN',
            }), {})
            .startWith({});

        return areKeysDown$.map(areKeysDown => {
            let direction = DIRECTION_FORWARD;
            if(areKeysDown[snake.keys.left] && !areKeysDown[snake.keys.right]) {
                direction = DIRECTION_LEFT;
            } else if(!areKeysDown[snake.keys.left] && areKeysDown[snake.keys.right]) {
                direction = DIRECTION_RIGHT;
            }
            return direction;
        });
    })

    const newBonuses$ = Observable.interval(100000 / FPS, requestAnimationFrame)
        .startWith(0)
        .filter(() => Math.random() > 0.5)
        .map(() => {
            return {
                x: getRandomInt(10, MAP_SIZE * SCALE - 10),
                y: getRandomInt(10, MAP_SIZE * SCALE - 10),
                created: Date.now(),
            };
    });

    const snakesDirections$ = Observable.combineLatest(...snakesDirections)
    const animation$ = Observable.interval(1000 / FPS, requestAnimationFrame).startWith(0);

    return {
        animation$, snakesDirections$, newBonuses$
    }
}

function snakeModel(previousState) {
    if (previousState.isDead) {
        return previousState;
    }

    const headPoint = {
        x: previousState.x,
        y: previousState.y,
    };
    const velocity = {
        x: previousState.vx,
        y: previousState.vy,
    }

    let pathCommand;
    const nextState = Object.assign({}, previousState);

    if(previousState.direction === DIRECTION_FORWARD) {
        nextState.x = headPoint.x + velocity.x * STEP;
        nextState.y = headPoint.y + velocity.y * STEP;
        pathCommand = `A 0 0 0 0 0 ${nextState.x} ${nextState.y}`;
    } else {
        const arc = getArc(CURVE_RADIUS, STEP, previousState.direction, velocity, headPoint);
        pathCommand = getSvgPath(CURVE_RADIUS, arc.Pa, arc.startAngle, arc.endAngle);

        nextState.x = arc.Pa.x;
        nextState.y = arc.Pa.y;
        nextState.vx = arc.Va.x;
        nextState.vy = arc.Va.y;
    }
    nextState.trail.push(pathCommand);

    return nextState;
}

function bonusModel(snakes, bonus) {
    return snakes.some(snake => {
        const x = newSnake.x - bonus.x;
        const y = newSnake.y - bonus.y;
        const distance = Math.sqrt(x*x + y*y);
        if (distance < 10) {
            return true;
        }
    });
}

function modelUpdates(animation$, snakesDirections$, newBonuses$) {
    const snakesStateUpdates$ = animation$
        .withLatestFrom(snakesDirections$, (_animationTick, snakesDirections) => snakesDirections)
        .map(snakesDirections => function(state) {
            const now = new Date();
            const fps = Math.round(1000 / (now - state.lastTick) / 5 ) * 5;
            const nextSnakes = state.snakes
                .map((snake, index) => {
                    snake.direction = snakesDirections[index];
                    return snake;
                })
                .map(snakeModel);

            return Object.assign({}, state, {
                fps,
                lastTick: new Date(),
                snakes: nextSnakes,
            });
        });

    const newBonusesUpdates$ = newBonuses$.map(newBonus => function(state) {
        return Object.assign({}, state, {
            bonuses: [...state.bonuses, newBonus],
        });
    });

    const staleBonusesUpdates$ = animation$.map(() => function(state) {
        const remainingBonuses = state.bonuses.filter(bonus => {
            return Date.now() - bonus.created < BONUS_LIFE;
        });
        return Object.assign({}, state, {
            bonuses: remainingBonuses,
        });
    });

    return Observable.merge(snakesStateUpdates$, newBonusesUpdates$, staleBonusesUpdates$);
}

function model(animation$, snakesDirections$, newBonuses$) {
    const initialState = {
        snakes: SNAKES_DATA.map(snake => {
            const initialPosition = randomStartState(MAP_SIZE * SCALE, MAP_SIZE * SCALE);
            return Object.assign(snake, initialPosition, {
                trail: [`M ${initialPosition.x} ${initialPosition.y}`],
            });
        }),
        bonuses: [],
        lastTick: new Date(),
        fps: 0
    };
    const updates$ = modelUpdates(animation$, snakesDirections$, newBonuses$);
    const state$ = updates$
        .startWith(initialState)
        .scan((state, update) => update(state));
    return state$;
}

function main(sources) {
    const { animation$, snakesDirections$, newBonuses$ } = intent(sources.Keyup, sources.Keydown);
    const state$ = model(animation$, snakesDirections$, newBonuses$);
    const vdom$ = state$.map(state => drawWorld(state));
    return { DOM: vdom$ };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
