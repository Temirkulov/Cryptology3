const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const upgrades = [0.05, 0.15, 0.3, 0.5, 1.00];
const initialCosts = [10, 50, 250, 750, 2500];
const upgrades2 = [
    { name: "5% Multiplier", cost: 10, multiplier: 0.05, initialCost: 10 },
    { name: "15% Multiplier", cost: 50, multiplier: 0.15, initialCost: 50 },
    { name: "30% Multiplier", cost: 250, multiplier: 0.3, initialCost: 250 },
    { name: "50% Multiplier", cost: 750, multiplier: 0.5, initialCost: 750 },
    { name: "100% Multiplier", cost: 2500, multiplier: 1.0, initialCost: 2500 },
];

function minPointsForAdditiveMultiplier(targetAddedMultiplier, upgrades, initialCosts) {
    let totalAddedMultiplier = 0.0;
    let totalCost = 0;
    let purchases = new Array(upgrades.length).fill(0);
    let currentCosts = [...initialCosts];

    while (totalAddedMultiplier < targetAddedMultiplier) {
        let effectiveness = upgrades.map((upgrade, index) => upgrade / currentCosts[index]);
        let bestUpgradeIndex = effectiveness.indexOf(Math.max(...effectiveness));
        totalCost += currentCosts[bestUpgradeIndex];
        totalAddedMultiplier += upgrades[bestUpgradeIndex];
        purchases[bestUpgradeIndex]++;
        currentCosts[bestUpgradeIndex] += initialCosts[bestUpgradeIndex];

        if (totalAddedMultiplier >= targetAddedMultiplier) {
            break;
        }
    }

    return { totalCost, purchases };
}

function calculateBusinessCapsCost(targetMultiplier, initialCap = 1000.95, capIncrease = 500, baseCapCost = 1000000, capIncreaseFactor = 2.5) {
    let capsNeeded = 0;
    let totalCapCost = 0;
    let currentCapCost = baseCapCost;

    // Adjust the calculation for caps needed based on the cap increase per business cap
    if (targetMultiplier > initialCap) {
        capsNeeded = Math.ceil((targetMultiplier - initialCap) / capIncrease);
        
        // Calculate the total cost for all needed business caps
        for (let i = 0; i < capsNeeded; i++) {
            totalCapCost += currentCapCost;
            currentCapCost *= capIncreaseFactor; // Increase the cost for the next cap
        }
    }

    // console.log(`Target Multiplier: ${targetMultiplier}`);
    // console.log(`Caps Needed: ${capsNeeded}`);
    // console.log(`Total Cap Cost: ${totalCapCost}`);

    return {
        capsNeeded,
        totalCapCost
    };
}

function calculateTimeToMilestones(balance, incomePerDay, prestigeLevel, milestones) {
    const milestoneData = [];
    const ppCost = (2000 * Math.pow(prestigeLevel, 3)) + (10000 * Math.pow(prestigeLevel, 2));
    const currentPP = balance / ppCost; // Current prestige points based on balance
    const ppPerDay = incomePerDay / ppCost; // Prestige points gained per day from income

    // console.log(`PP Cost: ${ppCost}`);
    // console.log(`Current Prestige Points: ${currentPP}`);
    // console.log(`Prestige Points per Day: ${ppPerDay}`);

    for (const milestone of milestones) {
        const { totalCost } = minPointsForAdditiveMultiplier(milestone, upgrades, initialCosts);
        const { totalCapCost } = calculateBusinessCapsCost(milestone);

        const totalMilestoneCost = totalCost + totalCapCost;
        // console.log(`Milestone: ${milestone}, Total Cost: ${totalCost}, Total Cap Cost: ${totalCapCost}, Combined Cost: ${totalMilestoneCost}`);

        const remainingCost = totalMilestoneCost - currentPP;
        // console.log(`Remaining Cost for Milestone ${milestone}: ${remainingCost}`);

        const timeRequiredInDays = remainingCost > 0 ? remainingCost / ppPerDay : 0;
        // console.log(`Time Required in Days for Milestone ${milestone}: ${timeRequiredInDays}`);

        const days = Math.floor(timeRequiredInDays);
        const hours = Math.floor((timeRequiredInDays % 1) * 24);
        milestoneData.push({
            milestone,
            days: Math.max(days, 0),
            hours: Math.max(hours, 0),
        });
    }

    // console.log(`Milestone Data: ${JSON.stringify(milestoneData, null, 2)}`);
    return milestoneData;
}
function calculateWithCaps(upgrades, availablePoints) {
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
function calculateTotalWarpTime(warps) {
    const warpDurations = {
        '30min': 0.5,
        '1hr': 1,
        '4hr': 4,
        '12hr': 12,
        '24hr': 24
    };

    let totalHours = 0;
    for (const warp in warpDurations) {
        const quantity = warps[warp] || 0;
        totalHours += quantity * warpDurations[warp];
    }

    return totalHours;
}

function calculateTotalWarpCost(warps, currentIncome) {
    const totalHours = calculateTotalWarpTime(warps);
    return totalHours * currentIncome;
}

function calculateTotalBriefcases(briefcases) {
    let totalBriefcases = 0;
    for (const briefcase in briefcases) {
        totalBriefcases += briefcases[briefcase] || 0;
    }

    return totalBriefcases;
}

// Example usage
function calculateTotalLootboxes(lootboxes) {
    let totalLootboxes = 0;
    for (const lootbox in lootboxes) {
        totalLootboxes += lootboxes[lootbox] || 0;
    }

    return totalLootboxes;
}


async function createProfileEmbed(interaction, userId, userData) {
    const activeLocation = userData.info.activeLocation || 'earth';
    const locationData = userData.locations[activeLocation] || { info: {}, balance: 0, income: 0 };
    const prestigeLevel = locationData.info.prestige || 0;
    const balance = locationData.info.balance || 0;
    const income = locationData.info.income || 0;
    const dailyIncome = income * 24 * 60; // Assuming income is per minute
    const storagedata = locationData.stats.boosts.storageCap || 1000000;
    const timetofillstorage = storagedata / (income * 60)
    const ppCost = (2000 * Math.pow(prestigeLevel, 3)) + (10000 * Math.pow(prestigeLevel, 2));
    const ppp = ppCost ? balance / ppCost : 0;
    const ppd = ppCost ? dailyIncome / ppCost : 0;
    const calcmulti = calculateWithCaps(upgrades2, ppp).finalTotalMultiplier;

    const milestones = [50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000];
    const milestoneData = calculateTimeToMilestones(balance, dailyIncome, prestigeLevel, milestones);

    const nextMilestones = milestoneData.filter(data => data.days > 0 || data.hours > 0).slice(0, 6);

    const milestoneDescriptions = nextMilestones.map(data => 
        `**${data.milestone}x**: ${data.days > 0 ? `${data.days} days` : ''} ${data.hours > 0 ? `${data.hours} hours` : ''}`
    ).join('\n');

    const formatNumber = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const giftgive = income * 60 * 2;
    const giftmax = dailyIncome;
    const dailydb = locationData.stats.boosts.dailyIncomeHours || 0;
    const userCorp = userData.info.corporation;
    const matchedCorp = await db.get(`corporationData.${userCorp}`) || {
        name: 'N/A',
        ceo: 'N/A',
        managers: [],
        employees: 0,
        level: 0,
        reputation_level: 0,
        cash: 0,
        income: 0,
        multiplier: 0,
        daily_boost: 0
    };
    // (corporation multi * prestige level) / 2
    const corpmulti = (parseFloat(matchedCorp.multiplier * prestigeLevel) / 2) > 2000 ? 2000 : (parseFloat(matchedCorp.multiplier * prestigeLevel) / 2);
    const totalmulti = parseFloat(calcmulti) + parseFloat(corpmulti);
    const totalWarpTime = calculateTotalWarpTime(userData.inventory.warps);
    const totalWarpCost = calculateTotalWarpCost(userData.inventory.warps, locationData.info.income);
    const totalBriefcases = calculateTotalBriefcases(userData.inventory.briefcases);
    const totalLootboxes = calculateTotalLootboxes(userData.inventory.lootboxes);

    return new EmbedBuilder()
        .setColor('#FEFFA3')
        .setTitle('Profile Report')
        .setDescription('Overview of your data')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({
            text: 'Developed by kulovich, Improved by ocryptic',
            iconURL: 'https://media.discordapp.net/attachments/776985762499002408/1245442193938714644/pngegg.png?ex=6658c3ee&is=6657726e&hm=c6d996935f825c04599f751adb887fdaafbcd99bb93b21f3e41270e4a452bf0d&=&format=webp&quality=lossless&width=1036&height=1036'
        })
        .addFields(
            { name: '<a:nod:1247259462046318703> User Data', value: 
            `**Username:** ${userData.info.username}\n`+
            `**Corporation:** ${userData.info.corporation}\n`+
            `**Active Location:** ${userData.info.activeLocation || 'N/A'}`, inline: false },
            { name: '<a:memeified_LVgold:1247259607873880115> Prestige Info', value: 
                `**Pres. Points/Day:** ${formatNumber(ppd)}\n` +
                `**Accumulated Pres. Points:** ${formatNumber(ppp)}\n` +
                `**Potential Multiplier:** ${formatNumber(calcmulti)}x (without corp)\n` +
                `**Potential Multiplier:** ${formatNumber(totalmulti)}x (with corp)\n` +
                `**Prestige:** ${userData.locations[activeLocation].info.prestige.toString()}`, inline: false },
            { name: '<a:memeified_worldwhite:1247258707671257221> Location Stats', value: 
                `**Balance:** ${formatNumber(locationData.info.balance)}\n` +
                `**Income per Day:** ${formatNumber(dailyIncome)}\n` +
                `**Current Multiplier:** ${formatNumber(locationData.info.multiplier)}x\n`, inline: false },
            { name: '<a:PepeMedal:1247258912860934285> Multiplier Milestones', value: milestoneDescriptions || 'N/A', inline: false },
            { name: '<a:yes:1247259394287075339> Inventory Info', value:
            `**Total Warp Time:** ${totalWarpTime || 0}\n` +
            `**Warp Money:** ${formatNumber(totalWarpCost || 0)}\n` +
            `**Total Briefcases:** ${totalBriefcases}\n` +
            `**Total Lootboxes:** ${totalLootboxes}\n`
            , inline: false },
            { name: '<a:hmph:1247263065703977012> Miscellanous', value: 
            `**Daily:** ${formatNumber(dailydb * income*60)} (without corp)\n` +
            `**Daily:** ${formatNumber((dailydb + matchedCorp.daily_boost)* income*60)} (with corp)\n` +
            `**Max Giftable:** ${formatNumber(giftgive)}\n` +
            `**Max Receivable:** ${formatNumber(giftmax)}\n` +

            `**Full Storage Takes:** ${formatNumber(timetofillstorage)} Hours`, inline: false },

        );
}

module.exports = {

    profileHandler: function (client) {
        const forecast = require('./Forecast.js');
        forecast.forecastHandler(client);    
        const prestige_report = require('./prestige_report.js');
        prestige_report.prestigeReportHandler(client);    

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() || interaction.customId !== 'profile') return;

            const userId = interaction.user.id;
            const userData = await db.get(`userData.${userId}`) || {};

            if (!userData || Object.keys(userData).length === 0) {
                await interaction.reply('No data found for your profile.');
                return;
            }

            const profileEmbed = await createProfileEmbed(interaction, userId, userData);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('forecast')
                        .setLabel('Profile Forecast')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('prestige_report')
                        .setLabel('Prestige Report')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [profileEmbed], components: [row] });
        });
    }
};
