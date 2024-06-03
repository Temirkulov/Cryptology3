// Function to calculate the cost of the nth business
function calculateNthBusinessCost(basePrice, scalingFactor, n) {
    if (n < 1) {
        throw new Error("Level must be at least 1.");
    }
    let owned = n - 1;  // Number of businesses owned is one less than the current level
    return basePrice * (scalingFactor * owned);
}

// Function to calculate the total cost for n businesses
function calculateTotalCostForNBusinesses(basePrice, scalingFactor, n) {
    let totalCost = 0;
    for (let i = 1; i <= n; i++) {
        totalCost += calculateNthBusinessCost(basePrice, scalingFactor, i);
    }
    return totalCost;
}

// Example usage with E-Sports Arena
const basePriceEsports = 720000;
const scalingFactorEsports = 110;
const nEsports = 10000;

// Calculate total cost for 10000 upgrades
let totalCostEsports = calculateTotalCostForNBusinesses(basePriceEsports, scalingFactorEsports, nEsports);
console.log(`Total cost for ${nEsports} E-Sports Arena upgrades: $${totalCostEsports}`);
