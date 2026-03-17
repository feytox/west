import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card instanceof Duck;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Dog extends Creature {
    constructor(name = "Пес-бандит", maxPower = 3) {
        super(name, maxPower);
    }
}

class Trasher extends Dog {
    constructor(name = "Громила", maxPower = 5) {
        super(name, maxPower);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        let newValue = value - 1;
        this.view.signalAbility(() => {
            super.modifyTakenDamage(newValue, fromCard, gameContext, continuation);
        });
    }

    getDescriptions() {
        return [...super.getDescriptions(), "Получает на 1 меньше урона"];
    }
}

class Gatling extends Creature {
    constructor() {
        super("Гатлинг", 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();

        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;

        for (let position = 0; position < oppositePlayer.table.length; position++) {
            const card = oppositePlayer.table[position];
            taskQueue.push(onDone => {
                if (card) {
                    this.dealDamageToCreature(2, card, gameContext, onDone);
                } else {
                    onDone();
                }
            });
        }

        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    constructor(name = "Браток", maxPower = 2) {
        super(name, maxPower);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
       Lad.setInGameCount(Lad.getInGameCount() + 1);
       super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
       Lad.setInGameCount(Lad.getInGameCount() - 1);
       super.doBeforeRemoving(continuation);
    }

    static getBonus() {
        let amount = this.inGameCount;
        return amount * (amount + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        let newValue = value + Lad.getBonus();
        super.modifyDealedDamageToCreature(newValue, toCard, gameContext, continuation);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        let newValue = value - Lad.getBonus();
        super.modifyTakenDamage(newValue, fromCard, gameContext, continuation);
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature')
            && Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            return [...super.getDescriptions(), "Чем их больше, тем они сильнее"];
        }
        return super.getDescriptions();
    }
}

class Rogue extends Creature {
    constructor() {
        super("Изгой", 2);
    }

    doBeforeAttack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer, position, updateView } = gameContext;
        const oppositeCard = oppositePlayer.table[position];

        if (oppositeCard) {
            const abilityNames = [
                'modifyDealedDamageToCreature',
                'modifyDealedDamageToPlayer',
                'modifyTakenDamage',
            ];
            const prototype = Object.getPrototypeOf(oppositeCard);

            for (const name of abilityNames) {
                if (prototype.hasOwnProperty(name)) {
                    this[name] = prototype[name];
                    delete prototype[name];
                }
            }
            updateView();
        }
        continuation();
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
];
const banditStartDeck = [
    new Lad(),
    new Lad(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
