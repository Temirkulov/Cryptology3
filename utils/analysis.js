const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const businessData = require("./businessData.json");

function calculateNthBusinessCost(basePrice, scalingFactor, owned, discount = 0) {
    return basePrice * (scalingFactor * owned) * (1 - discount);
}

function calculateAffordableQuantity(basePrice, scalingFactor, balance, startQuantity, maxQuantity, discount = 0) {
    let totalCost = 0;
    let quantity = 0;
    while (quantity < maxQuantity) {
        const nextCost = calculateNthBusinessCost(basePrice, scalingFactor, startQuantity + quantity, discount);
        if (totalCost + nextCost > balance) break;
        totalCost += nextCost;
        quantity++;
    }
    return { quantity, totalCost };
}

function findBestInvestments(location, businesses, balance, businessCap, discount = 0) {
    const investments = [];
    const userBusinesses = businesses; // Consider only businesses user currently owns

    Object.entries(userBusinesses).forEach(([businessId, currentQuantity]) => {
        const business = businessData[location].find(b => b.id === businessId);
        if (!business) return; // Skip if the business is not found in the business data

        const { base_price, scaling_factor, base_income, name } = business;
        if (currentQuantity >= businessCap) return;

        const { quantity, totalCost } = calculateAffordableQuantity(base_price, scaling_factor, balance, currentQuantity, businessCap - currentQuantity, discount);
        if (quantity > 0) {
            const income = base_income * quantity;
            const priceToIncomeRatio = totalCost / income;
            investments.push({
                id: businessId,
                name,
                quantity,
                totalCost,
                income,
                priceToIncomeRatio,
                startingPrice: calculateNthBusinessCost(base_price, scaling_factor, currentQuantity, discount)
            });
        }
    });

    // Sort investments by price to income ratio, lowest first (best ROI)
    investments.sort((a, b) => a.priceToIncomeRatio - b.priceToIncomeRatio);

    // Filter based on balance to simulate purchasing scenario
    const purchasePlan = [];
    let remainingBalance = balance;
    investments.forEach(investment => {
        if (investment.totalCost <= remainingBalance) {
            purchasePlan.push(investment);
            remainingBalance -= investment.totalCost;
        }
    });

    return purchasePlan;
}

async function generateAnalysisReport(userId) {
    const userData = await db.get(`userData.${userId}`);
    if (!userData) {
        throw new Error(`User data not found for userId: ${userId}`);
    }

    const location = userData.info.activeLocation;
    const balance = userData.locations[location].info.balance;
    const businesses = userData.locations[location].businesses;
    const businessCap = userData.locations[location].stats.boosts.businessCap || 10000;
    const discount = userData.info.corporationDiscount || 0; // Assuming discount is stored here

    console.log(`Generating analysis report for userId: ${userId}, location: ${location}`);
    console.log(`User balance: ${balance}`);
    console.log(`User business cap: ${businessCap}`);
    console.log(`Current businesses: ${JSON.stringify(businesses, null, 2)}`);
    console.log(`Corporation discount: ${discount}`);

    const purchasePlan = findBestInvestments(location, businesses, balance, businessCap, discount);

    if (purchasePlan.length === 0) {
        throw new Error(`No affordable businesses found for userId: ${userId} with balance: ${balance}`);
    }

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Best Businesses to Buy')
        .setDescription(`Based on your current balance of $${balance.toLocaleString()}`)
        .addFields(
            purchasePlan.map(investment => ({
                name: investment.name,
                value: `Quantity: ${investment.quantity}, Total Cost: $${investment.totalCost.toLocaleString()}, Starting Price: $${investment.startingPrice.toLocaleString()}`,
                inline: true
            }))
        );

    return embed;
}

module.exports = {
    analysisHandler: function (client) {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() || interaction.customId !== 'analysis') return;

            const userId = interaction.user.id;
            const userData = await db.get(`userData.${userId}`);

            if (!userData || Object.keys(userData).length === 0) {
                await interaction.reply('No data found for your profile.');
                return;
            }

            try {
                const analysisEmbed = await generateAnalysisReport(userId);

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('profile')
                            .setLabel('Profile Report')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('forecast')
                            .setLabel('Forecast Report')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('prestige_report')
                            .setLabel('Prestige Report')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.reply({ embeds: [analysisEmbed], components: [row] });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'An error occurred while generating the analysis report.', ephemeral: true });
            }
        });
    }
};
