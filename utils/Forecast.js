const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require("quick.db");
const fs = require('fs');
const db = new QuickDB();
const path = require('path');

// Load business data from JSON file
const businessData = require('./businessData.json');

// Function to calculate the cost of the nth business
function calculateNthBusinessCost(basePrice, scalingFactor, n) {
    if (n < 1) {
        throw new Error("Level must be at least 1.");
    }
    let owned = n - 1;  // Number of businesses owned is one less than the current level
    return basePrice * Math.pow(scalingFactor, owned);
}

// Function to calculate the total cost for n businesses
function calculateTotalCostForNBusinesses(basePrice, scalingFactor, n) {
    let totalCost = 0;
    for (let i = 1; i <= n; i++) {
        let owned = i - 1; // Number of businesses owned is one less than the current level
        totalCost += basePrice * Math.pow(scalingFactor, owned);
    }
    return totalCost;
}

// Function to calculate the total cost and income for businesses based on the prestige level
function calculateNextPrestigeValues(prestigeLevel, location, businessCap, discount = 0, researchBonus = 0.2) {
    const locationBusinesses = businessData[location];
    let totalCost = 0;
    let totalIncome = 0;
    let unlockedBusinesses = [];

    locationBusinesses.forEach(business => {
        if (prestigeLevel >= business.prestige_unlock) {
            const basePrice = business.base_price;
            const scalingFactor = business.scaling_factor;
            const baseIncome = business.base_income;

            // Calculate the number of businesses unlocked at the next prestige level
            const numBusinesses = businessCap;
            unlockedBusinesses.push(business.name);

            // Calculate total cost for unlocked businesses with discount
            const businessCost = calculateTotalCostForNBusinesses(basePrice * (1 - discount), scalingFactor, numBusinesses);

            // Calculate total income for unlocked businesses with research bonus
            const businessIncome = baseIncome * numBusinesses * (1 + researchBonus);

            totalCost += businessCost;
            totalIncome += businessIncome;

            console.log(`Business: ${business.name}, Unlocked Businesses: ${numBusinesses}`);
            console.log(`Business Cost: ${businessCost}, Business Income: ${businessIncome}`);
        }
    });

    console.log(`Unlocked Businesses: ${unlockedBusinesses}`);

    return {
        totalCost,
        totalIncome
    };
}

// Function to calculate the total prestige points
function calculatePrestigePoints(balance, prestigeLevel) {
    const ppCost = (2000 * Math.pow(prestigeLevel, 3)) + (10000 * Math.pow(prestigeLevel, 2));
    console.log(`PP Cost: ${ppCost}`);
    return balance / ppCost;
}
const upgrades = [
    { name: "5% Multiplier", cost: 10, multiplier: 0.05, initialCost: 10 },
    { name: "15% Multiplier", cost: 50, multiplier: 0.15, initialCost: 50 },
    { name: "30% Multiplier", cost: 250, multiplier: 0.3, initialCost: 250 },
    { name: "50% Multiplier", cost: 750, multiplier: 0.5, initialCost: 750 },
    { name: "100% Multiplier", cost: 2500, multiplier: 1.0, initialCost: 2500 },
];


function calculatePotentialMultiplier(upgrades, availablePoints) {
    let totalMultiplier = 1.0; // Starting base multiplier
    let businessCap = 1000.95; // Initial business cap
    let capCost = 1000000; // Cost for a business cap
    let capsPurchased = 0; // Track number of business caps purchased
    let points = availablePoints;

    upgrades.forEach(upgrade => {
        upgrade.purchased = 0;
        upgrade.currentCost = upgrade.cost;
    });

    while (points > 0) {
        let upgradeMade = false;
        upgrades.sort((a, b) => (b.multiplier / b.currentCost) - (a.multiplier / a.currentCost));

        for (const upgrade of upgrades) {
            const canAffordCap = (totalMultiplier + upgrade.multiplier > businessCap) && (points - upgrade.currentCost >= capCost);
            const withinCap = totalMultiplier + upgrade.multiplier <= businessCap;
            if (points >= upgrade.currentCost && (withinCap || canAffordCap)) {
                totalMultiplier += upgrade.multiplier;
                points -= upgrade.currentCost;
                upgrade.purchased++;
                upgrade.currentCost += upgrade.cost;
                upgradeMade = true;
                if (canAffordCap) {
                    businessCap += 500;
                    points -= capCost;
                    capCost *= 2.5;
                    capsPurchased++;
                }
                break;
            }
        }

        if (!upgradeMade) break;
    }

    const purchases = upgrades.filter(u => u.purchased > 0)
                              .sort((a, b) => a.multiplier - b.multiplier)
                              .map(u => `${u.name}: ${u.purchased} times`);

    return {
        purchases,
        businessCapsPurchased: capsPurchased,
        finalTotalMultiplier: totalMultiplier.toFixed(2),
        remainingPoints: points.toFixed(2)
    };
}

async function createForecastEmbed(interaction, userId, userData) {
    const activeLocation = userData.info.activeLocation || 'earth';
    const locationData = userData.locations[activeLocation] || { info: {}, balance: 0, income: 0, stats: { boosts: { businessCap: 1 } } };
    const prestigeLevel = locationData.info.prestige || 0;
    const nextPrestigeLevel = prestigeLevel + 1;
    const balance = locationData.info.balance || 0;
    const income = locationData.info.income || 0;
    const dailyIncome = income * 24 * 60; // Assuming income is per minute
    const businessCap = locationData.stats.boosts.businessCap || 1;
    const corporationData = await db.get(`corporationData.${userData.info.corporation}`) || {};
    const discount = userData.info.corporation && userData.info.businessdiscount !== undefined ? userData.info.businessdiscount : 0;
    const corpmulti = corporationData.multiplier ? Math.min((parseFloat(corporationData.multiplier * prestigeLevel) / 2), 2000) : 0;

    const nextValues = calculateNextPrestigeValues(nextPrestigeLevel, activeLocation, businessCap, discount);
    const prestigePoints = calculatePrestigePoints(balance, prestigeLevel);
    const potentialmulti = calculatePotentialMultiplier(upgrades,prestigePoints);
    const potentialMultiplier = parseFloat(potentialmulti.finalTotalMultiplier) + corpmulti;
    console.log(`prestige points: ${prestigePoints}`)
    console.log(`corp multi is ${corpmulti}`)
    console.log(`1. potential Multiplier: ${potentialMultiplier}`)

    const futureIncome = nextValues.totalIncome * potentialMultiplier;
    const futurePPD = calculatePrestigePoints(futureIncome * 1440, nextPrestigeLevel);

    // console.log(`Balance: ${balance}`);
    // console.log(`Income: ${income}`);
    // console.log(`Prestige Level: ${prestigeLevel}`);
    // console.log(`Next Prestige Level: ${nextPrestigeLevel}`);
    // console.log(`Daily Income: ${dailyIncome}`);
    // console.log(`Prestige Points Cost: ${(2000 * Math.pow(nextPrestigeLevel, 3)) + (10000 * Math.pow(nextPrestigeLevel, 2))}`);
    // console.log(`Potential Prestige Points: ${prestigePoints}`);
    // console.log(`Potential Multiplier: ${potentialMultiplier}`);
    // console.log(`Future Income: ${futureIncome}`);
    // console.log(`Future PPD: ${futurePPD}`);

    const formatNumber = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return new EmbedBuilder()
        .setColor('#FEFFA3')
        .setAuthor({ name: `${interaction.user.username} | ${activeLocation} Forecast`, iconURL: interaction.user.displayAvatarURL() })
        .setFooter({
            text: 'Developed by kulovich & Majo',
            iconURL: 'https://media.discordapp.net/attachments/776985762499002408/1245442193938714644/pngegg.png?ex=6658c3ee&is=6657726e&hm=c6d996935f825c04599f751adb887fdaafbcd99bb93b21f3e41270e4a452bf0d&=&format=webp&quality=lossless&width=1036&height=1036'
        })
        .addFields(
            { name: 'Corporation', value: `🏛 ${userData.info.corporation || 'N/A'}`, inline: false },
            { name: 'Balance', value: `💰 $${formatNumber(locationData.info.balance)}`, inline: false },
            { name: 'Future Income', value: `💸 $${formatNumber(futureIncome) || 'N/A'}/min`, inline: false },
            { name: 'Prestige', value: `🔰 ${nextPrestigeLevel || 'N/A'}`, inline: false },
            { name: 'Prestige Points', value: `💠 ${formatNumber(prestigePoints) || 'To Be Done'}`, inline: false },
            { name: 'Coins', value: `:coin: ${userData.info.coins || 'N/A'}`, inline: false },
            { name: 'Briefcases', value: `💼 ${userData.info.briefcases || 'N/A'}`, inline: false },
            { name: 'Total Multiplier', value: `📈 ${potentialMultiplier.toFixed(2) || 'N/A'}`, inline: false },
        );
}

module.exports = {
    forecastHandler: function (client) {
        const prestige_report = require('./prestige_report.js');
        prestige_report.prestigeReportHandler(client);    

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() || interaction.customId !== 'forecast') return;

            const userId = interaction.user.id;
            const userData = await db.get(`userData.${userId}`) || {};

            if (!userData || Object.keys(userData).length === 0) {
                await interaction.reply('No data found for your profile.');
                return;
            }

            const forecastEmbed = await createForecastEmbed(interaction, userId, userData);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('profile')
                        .setLabel('Profile Report')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('prestige_report')
                        .setLabel('Prestige Report')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [forecastEmbed], components: [row] });
        });
    }
};
