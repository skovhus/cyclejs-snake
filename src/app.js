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
const CURVE_RADIUS = 30;

const DIRECTION_RIGHT = -1;
const DIRECTION_LEFT = 1;
const DIRECTION_FORWARD = 0;

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

function drawWorld(values) {
    const snakes = values.slice(0, SNAKES_DATA.length).map(playerState =>
        h('path', {
            attrs: {
                d: playerState.trail.join(' '),
                style: `stroke: ${playerState.snake.color}`,
                class: 'snake',
            }
        })
    );
    const bonuses = values.pop().map(bonus => h('circle', {
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
        startPoint: {x: getRandomInt(mapWidth/3, 2*mapWidth/3), y: getRandomInt(mapHeight/3, 2*mapHeight/3)},
        startVelocity: {x: Vx, y: Vy},
    };
    return startpoint;
}

function intent(Keyup, Keydown) {
    const snakes = SNAKES_DATA.map(snake => {
        Object.assign(snake, randomStartState(MAP_SIZE * SCALE, MAP_SIZE * SCALE));
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

        const playerKeys$ = areKeysDown$.map(areKeysDown => {
            let direction = DIRECTION_FORWARD;
            if(areKeysDown[snake.keys.left] && !areKeysDown[snake.keys.right]) {
                direction = DIRECTION_LEFT;
            } else if(!areKeysDown[snake.keys.left] && areKeysDown[snake.keys.right]) {
                direction = DIRECTION_RIGHT;
            }
            return {
                left: areKeysDown[snake.keys.left],
                right: areKeysDown[snake.keys.right],
                direction
            };
        });

        return Object.assign({}, snake, { keys$: playerKeys$ });
    })

    const animation$ = Observable.interval(1000 / FPS, requestAnimationFrame);

    return {
        animation$, snakes
    }
}

function model(animation$, snakes, bonuses$) {
    return snakes.map(snake => {
        return animation$.withLatestFrom(snake.keys$, bonuses$, (_animationTick, keysState, bonuses) => ({keysState, bonuses}))
        .scan((previousState, partialStates) => {
            const keysState = partialStates.keysState;
            const bonuses = partialStates.bonuses;
            if (previousState.dead) {
                return previousState;
            }
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
                pathD = `A 0 0 0 0 0 ${newSnake.x} ${newSnake.y}`;
            } else {
                // Turning
                const velocity = {
                    x: newSnake.vx,
                    y: newSnake.vy
                };

                const arc = getArc(CURVE_RADIUS, STEP, keysState.direction, velocity, snakePoint);
                pathD = getSvgPath(CURVE_RADIUS, arc.Pa, arc.startAngle, arc.endAngle);

                newSnake.x = arc.Pa.x;
                newSnake.y = arc.Pa.y;
                newSnake.vx = arc.Va.x;
                newSnake.vy = arc.Va.y;
            }


            bonuses.forEach(bonus => {
                const x = newSnake.x - bonus.x;
                const y = newSnake.y - bonus.y;
                const distance = Math.sqrt(x*x + y*y);
                if (distance < 10) {
                    console.log("WOOOT", distance)
                }
            });

            /* Crude collision detection */
            const COLLISION_THRESHOLD = 2.3; // Higher report false positives
            function toVisitedPoint(position) {
                return `${Math.floor(position.x/COLLISION_THRESHOLD)}:${Math.floor(position.y/COLLISION_THRESHOLD)}`;
            }

            const visited = previousState.visited;
            const visitedPoint = toVisitedPoint(newSnake);
            const outsideMap = newSnake.x < 0 || newSnake.y < 0 || newSnake.x > MAP_SIZE || newSnake.y > MAP_SIZE;
            const collision = visited.has(visitedPoint);

            if (outsideMap || collision) {
                console.log(visitedPoint, visited)
                dead = true;
            } else {
                newTrail.push(pathD);
                visited.add(visitedPoint);
            }

            return {
                dead: dead,
                fps: fps,
                lastTick: now,
                snake: newSnake,
                trail: newTrail,
                visited: visited,
            };
        }, {
            trail: [`M ${snake.startPoint.x} ${snake.startPoint.y}`],
            visited: new Set(),
            snake: {
                x: snake.startPoint.x,
                y: snake.startPoint.y,
                vx: snake.startVelocity.x,
                vy: snake.startVelocity.y,
                name: snake.name,
                color: snake.color,
            },
            lastTick: new Date(),
            fps: 0
        });
    })
}

function getBonuses() {
    return Observable.interval(100000 / FPS, requestAnimationFrame).scan((bonuses, tick) => {
        return [{
            x: 100,
            y: 100
        }]
        const newBonus = {
            x: getRandomInt(10, MAP_SIZE * SCALE - 10),
            y: getRandomInt(10, MAP_SIZE * SCALE - 10),
            created: tick,
        };
        const nextBonuses = bonuses.filter(bonus => {
            return tick - bonus.created < 4;
        })
        if(Math.random() > 0.5)
            return [...nextBonuses, newBonus];
        else {
            return nextBonuses;
        }
    }, []);
}

function main(sources) {
    const { animation$, snakes } = intent(sources.Keyup, sources.Keydown);
    const bonuses$ = getBonuses();
    const playersStates = model(animation$, snakes, bonuses$);

    const snakes$ = Observable.combineLatest(...playersStates, bonuses$).map(playersState => drawWorld(playersState))

    return {
        DOM: snakes$.map(snakes =>
            h('div', [
                // h('div', {props: {className: 'fps'}}, 'FPS: ' + state.fps),
                snakes
            ])
        )
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#main-container'),
    Keydown: () => Observable.fromEvent(document, 'keydown'),
    Keyup: () => Observable.fromEvent(document, 'keyup'),
});
