const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require("quick.db");
const fs = require('fs');
const db = new QuickDB();
const path = require('path');
const BigNumber = require('bignumber.js'); // Install BigNumber.js for handling large numbers

// Load business data from JSON file
const businessData = require('./businessData.json');

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
        totalIncome,
        unlockedBusinesses
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
function checkNewBusinessUnlock(prestigeLevel, location) {
    const nextPrestigeLevel = prestigeLevel + 1;
    const locationBusinesses = businessData[location];

    for (const business of locationBusinesses) {
        if (business.prestige_unlock === nextPrestigeLevel) {
            return business.name;
        }
    }
    return 'No';
}
function countUnlockedBusinesses(prestigeLevel, location) {
    const locationBusinesses = businessData[location];
    let unlockedCount = 0;

    locationBusinesses.forEach(business => {
        if (prestigeLevel >= business.prestige_unlock) {
            unlockedCount++;
        }
    });

    return unlockedCount;
}

async function createPrestigeReportEmbed(interaction, userId, userData) {
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
    const maxbusinesscap = (nextPrestigeLevel*5000*4)-10000;
    const maxnextValues = calculateNextPrestigeValues(nextPrestigeLevel, activeLocation, maxbusinesscap, discount);
    const prestigePoints = calculatePrestigePoints(balance, prestigeLevel);
    const potentialmulti = calculatePotentialMultiplier(upgrades, prestigePoints);
    const potentialMultiplier = parseFloat(potentialmulti.finalTotalMultiplier) + corpmulti;
    console.log(`Potential Multiplier: ${potentialMultiplier}`);

    const futureIncome = nextValues.totalIncome * potentialMultiplier;
    const futurePPD = calculatePrestigePoints(futureIncome * 1440, nextPrestigeLevel);
    const unlockedBusinessesCount = countUnlockedBusinesses(nextPrestigeLevel, activeLocation);

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
    const rewards = calculateCoinsAndBriefcases(prestigePoints);
    const newBusinessUnlock = checkNewBusinessUnlock(prestigeLevel, activeLocation);

    const formatNumber = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return new EmbedBuilder()
        .setColor('#FEFFA3')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setAuthor({ name: `${interaction.user.username} | ${activeLocation} Prestige Report`, iconURL: interaction.user.displayAvatarURL() })
        .setFooter({
            text: 'Developed by kulovich & Majo',
            iconURL: 'https://media.discordapp.net/attachments/776985762499002408/1245442193938714644/pngegg.png?ex=6658c3ee&is=6657726e&hm=c6d996935f825c04599f751adb887fdaafbcd99bb93b21f3e41270e4a452bf0d&=&format=webp&quality=lossless&width=1036&height=1036'
        })
        .setDescription(`Potential Profile for next Prestige Level`)
        .addFields(
            { name: 'Overview', value: 
            `**Income:** $${formatNumber(futureIncome) || 'N/A'}/min\n` +
            `**Income/Day:** $${formatNumber(futureIncome*24*60) || 'N/A'}\n` +
            `**Next Prestige Level:** ${nextPrestigeLevel || 'N/A'}`, inline: false },
            { name: 'Prestige Info', value: 
            `**Prestige Points:** ${formatNumber(prestigePoints) || 'To Be Done'}\n` +
            `**Future Pres.Pts/Day:** ${formatNumber(futurePPD) || 'N/A'}\n` +
            `**Max Business Cap:** ${formatNumber(maxbusinesscap) || 'N/A'}\n` +
            `**Max Income:** $${formatNumber(maxnextValues.totalIncome * potentialMultiplier) || 'N/A'}/min (max BCap)\n`+
            `**Next Business Unlock:** ${newBusinessUnlock || 'N/A'}\n` +
            `**Unlocked Businesses:** ${unlockedBusinessesCount || 'N/A'}\n`+
            `**Total Business Cost:** $${formatNumber(nextValues.totalCost) || 'N/A'}\n`
            , inline: false },
            { name: 'Prestige Rewards', value: 
            `**Coins:** ${formatNumber(rewards.coins) || 'N/A'}\n` +
            `**Briefcases:** ${formatNumber(rewards.briefcases) || 'N/A'}`, inline: false },
            { name: 'Multiplier Info', value: 
            `**Potential Multiplier:** ${potentialmulti.finalTotalMultiplier || 'N/A'}\n` +
            `**Potential Corp Multi:** ${corpmulti || 0}\n` +
            `**Total Multiplier:** ${potentialMultiplier.toFixed(2) || 'N/A'}\n` +
            `**Remaining Points:** ${formatNumber(potentialmulti.remainingPoints) || 'N/A'}\n` +
            `**Total Caps Purchased:** ${potentialmulti.businessCapsPurchased || 0}\n`,inline: false }
            // { name: 'Total Multiplier', value: `📈 ${potentialMultiplier.toFixed(2) || 'N/A'}`, inline: false },
            // { name: 'Potential Prestige Points per Day', value: `💠 ${formatNumber(futurePPD) || 'N/A'}`, inline: false },
            // { name: 'Business Cap', value: `🏢 ${businessCap || 'N/A'}`, inline: false },
            // { name: 'Unlocked Businesses', value: `${nextValues.unlockedBusinesses.join(', ') || 'N/A'}`, inline: false },
        );
}
// Function to calculate the number of digits in a number
function numberOfDigits(number) {
    return Math.floor(Math.log10(number) + 1);
}

// Function to calculate potential coins and briefcases based on prestige points
function calculateCoinsAndBriefcases(prestigePoints) {
    const digits = numberOfDigits(prestigePoints);
    const coins = Math.pow(digits, 2);
    const briefcases = digits;

    return {
        coins,
        briefcases
    };
}

module.exports = {
    prestigeReportHandler: function (client) {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() || interaction.customId !== 'prestige_report') return;

            try {
                await interaction.deferReply();

                const userId = interaction.user.id;
                const userData = await db.get(`userData.${userId}`) || {};

                if (!userData || Object.keys(userData).length === 0) {
                    await interaction.editReply('No data found for your profile.');
                    return;
                }

                const prestigeReportEmbed = await createPrestigeReportEmbed(interaction, userId, userData);

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

                await interaction.editReply({ embeds: [prestigeReportEmbed], components: [row] });
            } catch (error) {
                console.error('Error generating prestige report:', error);
                try {
                    await interaction.editReply('An error occurred while generating your prestige report.');
                } catch (editError) {
                    console.error('Error editing the reply:', editError);
                }
            }
        });
    }
};
