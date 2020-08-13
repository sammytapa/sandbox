'use strict';

const fetch = require('node-fetch');

const input = process.argv.slice(2)[0];
const data = require(`./${input}`);

const getData = async url => {
    try {
        const response = await fetch(url);
        const json = await response.json();
        return json;
    } catch (error) {
        throw new Error('Can\'t get fees.');
    }
};

let tempState = {};
let currentDay = 1; // 1 - monday, 2 - tues, ...

const calculateCommision = (transaction, fee) => {
    const { date, user_id, user_type, type, operation: { amount } } = transaction;

    if (!(user_id in tempState)) {
        tempState[user_id] = fee.outNatural.week_limit;
    }

    if (type === 'cash_in') {
        const transCommision = (fee.in.percents / 100) * amount;
        const commision = transCommision < 5 ? transCommision : 5;

        return commision;
    } else if (type === 'cash_out') {
        if (user_type === 'natural') {
            const commision = (fee.outNatural.percents / 100) * (amount - tempState[user_id].amount);

            // subtract amount to limit
            tempState[user_id].amount -= amount;
            tempState[user_id].amount = Math.sign(tempState[user_id].amount) === -1 ? 0 : tempState[user_id].amount;

            const day = new Date(date).getDay();
            currentDay = day;

            // reset if sunday - end of week
            if (day === 0 && currentDay !== 0) {
                tempState = {};
            }

            return commision;
        } else if (user_type === 'juridical') {
            if (amount <= fee.outJuridical.min.amount) return 'Minimum cashout not met.'
            const commision = (fee.outJuridical.percents / 100) * amount;

            return commision;
        }

        return 'Invalid Cash Out';
    }

    return 'Invalid Transaction';
}

const runApp = async () => {
    const fee = {
        in: await getData('http://private-38e18c-uzduotis.apiary-mock.com/config/cash-in'),
        outNatural: await getData('http://private-38e18c-uzduotis.apiary-mock.com/config/cash-out/natural'),
        outJuridical: await getData('http://private-38e18c-uzduotis.apiary-mock.com/config/cash-out/juridical')
    }

    data.forEach(transaction => {
        const commision = calculateCommision(transaction, fee);
        console.log(`${(Math.round(commision * 100) / 100).toFixed(2)}`);
    });
}

runApp();