const businessData = require("./businessData.json").earth; // Assuming the file has correct path

function calculateNthBusinessCost(basePrice, scalingFactor, owned) {
    if (owned < 0) {
        throw new Error("Owned count must be at least 0.");
    }
    // Calculate the cost for the next purchase based on the total number owned
    return basePrice * (scalingFactor * owned);
}

function calculateNextUpgradeCosts(businesses) {
    console.log("Calculating next upgrade costs for each business:");
    Object.entries(businesses).forEach(([id, quantity]) => {
        const business = businessData.find(b => b.id === id);
        if (!business) {
            console.error(`No data found for business with ID: ${id}`);
            return;
        }
        const { base_price, scaling_factor, name } = business;
        const nextCost = calculateNthBusinessCost(base_price, scaling_factor, quantity);  // quantity represents the number already owned
        console.log(`${name} (${id}): Next upgrade (${quantity + 1}th) will cost $${nextCost.toLocaleString()}`);
    });
}

// Example usage, assuming you have the following businesses:
const userBusinesses = {
    "pizza": 16,
    "carwash": 94,
    "restaurant": 100,
    "bank": 4900,
    "oil": 8058,
    "airport": 10003
};

calculateNextUpgradeCosts(userBusinesses);
