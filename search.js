/* eslint-disable */
const fs = require('fs');
const lines = fs.readFileSync('c:/Users/Eulysis/Documents/EMapandan/app/admin/transactions/actions.ts', 'utf8').split('\n');
lines.forEach((l, i) => {
    if (l.includes('endorseBuildingPermitFees')) {
        console.log(i + 1, l.trim());
    }
});
