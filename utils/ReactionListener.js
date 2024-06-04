const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const { defaultProfileData } = require("./ProfileDataStructure");
const { sendProfileReport, sendForecastReport } = require('./Profile');

function parseValue(value) {
    const cleanedValue = value.replace(/<:[^:]+:\d+>/g, '').replace(/[^\d.-]/g, '');
    return cleanedValue.includes('.') ? parseFloat(cleanedValue) : parseInt(cleanedValue);
}

function categorizeLocation(locationString) {
    const keywordToLocation = {
        "Earth": "earth",
        "Moon": "moon",
        "Mars": "mars",
        "Rush Colony": "rush_colony",
    };

    for (const [keyword, location] of Object.entries(keywordToLocation)) {
        if (locationString.includes(keyword)) {
            return location;
        }
    }

    return "unknown_location";
}

async function updateLocationData(userId, activeLocation, newLocationData) {
    const userDataPath = `userData.${userId}`;
    let userData = await db.get(userDataPath) || { info: {}, locations: {} };

    if (!userData.locations[activeLocation]) {
        userData.locations[activeLocation] = {};
    }
    userData.locations[activeLocation] = {
        ...userData.locations[activeLocation],
        ...newLocationData
    };

    await db.set(userDataPath, userData);
}

const initializeUserData = async (userId) => {
    const defaultUserData = JSON.parse(JSON.stringify(defaultProfileData));
    defaultUserData.info.userid = userId;
    await db.set(`userData.${userId}`, defaultUserData);
    return defaultUserData;
};

function stringifyEmbedFields(fields) {
    return fields.map(field => ({
        name: field.name,
        value: field.value,
        inline: field.inline || false
    }));
}

function parseMultiplier(value) {
    return parseFloat(value.replace(/[^0-9.]/g, ''));
}

function removeSpecificEmoji(text) {
    return text.replace(/🏛/g, '').trim();
}

function parseInventoryEmbed(embed) {
    const inventory = {
        warps: [],
        briefcases: [],
        lootboxes: [],
    };

    embed.fields.forEach(field => {
        const fieldName = field.name;
        const fieldValue = field.value;

        switch (true) {
            case fieldName.includes('Warps'):
                const warps = fieldValue.match(/`(\d+x)` ([\d\w\s]+)/g);
                if (warps) {
                    warps.forEach(warp => {
                        const [amount, type] = warp.split('x').map(part => part.trim().replace(/[`]/g, ''));
                        inventory.warps.push({ type, amount: parseInt(amount, 10) });
                    });
                }
                const totalTimeMatch = fieldValue.match(/Total Time: ([\d.]+) Hours/);
                if (totalTimeMatch) {
                    inventory.totalTime = parseFloat(totalTimeMatch[1]);
                }
                break;

            case fieldName.includes('Briefcases'):
                const briefcases = fieldValue.match(/`(\d+x)` ([\w\s]+) Briefcase/g);
                if (briefcases) {
                    briefcases.forEach(briefcase => {
                        const [amount, type] = briefcase.split('x').map(part => part.trim().replace(/[`]/g, ''));
                        inventory.briefcases.push({ type, amount: parseInt(amount, 10) });
                    });
                }
                break;

            case fieldName.includes('Loot Boxes'):
                const lootboxes = fieldValue.match(/`(\d+x)` ([\w\s]+) Loot Box/g);
                if (lootboxes) {
                    lootboxes.forEach(box => {
                        const [amount, type] = box.split('x').map(part => part.trim().replace(/[`]/g, ''));
                        inventory.lootboxes.push({ type, amount: parseInt(amount, 10) });
                    });
                }
                break;

            case fieldName.includes('Coins'):
                const coinsMatch = fieldValue.match(/`(\d+x)` Coins/);
                if (coinsMatch) {
                    inventory.coins = parseInt(coinsMatch[1], 10);
                }
                break;
        }
    });

    return inventory;
}

async function handleInventoryUpdateMessage(newMessage) {
    if (newMessage.embeds.length > 0) {
        const updatedEmbed = newMessage.embeds[0];
        console.log(`Updated Embed: ${updatedEmbed.title || 'No Title'}`);

        if (updatedEmbed.fields && updatedEmbed.fields.length > 0) {
            const inventoryData = parseInventoryEmbed(updatedEmbed);

            let username;
            let activeLocation;

            if (updatedEmbed.footer && updatedEmbed.footer.text) {
                const footerText = updatedEmbed.footer.text;
                const lines = footerText.split('\n');

                let usernameLine;
                switch (lines.length) {
                    case 1:
                        usernameLine = lines[0];
                        break;
                    case 2:
                        usernameLine = lines[1];
                        break;
                    case 3:
                    default:
                        usernameLine = lines[2];
                        break;
                }

                [username, activeLocation] = usernameLine.split('|').map(part => part.trim());
            } else {
                console.error('No footer text found');
                return;
            }

            console.log(`Username: ${username}, Active Location: ${activeLocation}`);

            const userProfile = await db.get(`userData.${username}`) || await initializeUserData(username);
            userProfile.info.username = username;
            userProfile.info.activeLocation = activeLocation;

            if (userProfile.inventory.briefcases) {
                userProfile.info.briefcases = userProfile.inventory.briefcases.reduce((total, briefcase) => total + briefcase.amount, 0);
            }

            if (Object.keys(inventoryData).length > 0) {
                userProfile.inventory = inventoryData;
                await db.set(`userData.${username}`, userProfile);
                console.log(`Updated User Data for ${username}:`, JSON.stringify(userProfile, null, 2));
            }
        } else {
            console.log('No fields in this embed.');
        }
    }
}

module.exports = {
    handleIdleCapReactionAdd: async function (client) {
        const profile = require('./Profile.js');
        profile.profileHandler(client);
        const prestige_report = require('./prestige_report.js');
        prestige_report.prestigeReportHandler(client);

        client.on('messageCreate', async message => {
            if (message.author.bot && message.author.id === '512079641981353995') {
                await delay(2000);
                if (message.embeds.length > 0) {
                    const embed = message.embeds[0];
                    console.log(embed);

                    let username = null;
                    if (embed.footer && embed.footer.text) {
                        const footerText = embed.footer.text;
                        const lines = footerText.split('\n');

                        let usernameLine;
                        switch (lines.length) {
                            case 1:
                                usernameLine = lines[0];
                                break;
                            case 2:
                                usernameLine = lines[1];
                                break;
                            case 3:
                            default:
                                usernameLine = lines[2];
                                break;
                        }

                        username = usernameLine.split('|')[0].trim();
                    } else {
                        console.error('No footer text found');
                        return;
                    }

                    try {
                        await message.react('📋');
                        console.log("Awaiting reactions to Idlecapitalist bot message...");

                        const filter = (reaction, user) => reaction.emoji.name === '📋' && !user.bot;
                        const collector = message.createReactionCollector({ filter, max: 1, time: 15000 });

                        collector.on('collect', async (reaction, user) => {
                            console.log(`Successfully collected ${reaction.emoji.name} from ${user.tag} on Idlecapitalist message.`);
                            if (user.username === username) {
                                console.log('User is the same as the one who reacted');
                            } else {
                                console.log('User is not the same as the one who reacted');
                                message.channel.send(`React to your own profile buddy ${user.username} <a:oil_papapet:782232194512715776>`);
                                return;
                            }

                            const embedData = message.embeds[0];
                            const fieldsStringified = stringifyEmbedFields(embedData.fields);
                            console.log(JSON.stringify(fieldsStringified, null, 2));
                            const activeLocation = categorizeLocation(embedData.footer.text.split('|')[1].trim());
                            console.log(`Active Location: ${activeLocation}`);

                            let userData = await db.get(`userData.${user.id}`) || await initializeUserData(user.id);
                            console.log(`User Data for ${user.id}:`, userData);
                            
                        
                            embedData.fields.forEach(field => {
                                switch (field.name) {
                                    case 'Corporation':
                                        userData.info.corporation = removeSpecificEmoji(field.value);
                                        console.log(`Corporation: ${userData.info.corporation}`);
                                        break;
                                    case 'Briefcases':
                                        userData.info.briefcases = parseInt(field.value.replace(/[^\d]/g, ''));
                                        break;
                                    case 'Coins':
                                        const coinsString = field.value.replace(/<:[^:]+:\d+>/g, '').replace(/[^\d]/g, '');
                                        userData.info.coins = parseInt(coinsString);
                                        break;
                                    case 'Balance':
                                        const balanceString = field.value.replace(/[^\d.-]/g, '');
                                        const balance = parseFloat(balanceString);
                                        const activeLocationForBalance = categorizeLocation(embedData.author.name.split('|')[1].trim());
                                        console.log(`Active Location for Balance: ${activeLocationForBalance}`);
                                        if (userData.locations[activeLocationForBalance]) {
                                            userData.locations[activeLocationForBalance].info.balance = balance;
                                        } else {
                                            console.error(`Invalid or undefined location '${activeLocationForBalance}'`);
                                        }
                                        break;
                                    case 'Income':
                                        const income = parseValue(field.value);
                                        const activeLocationForIncome = categorizeLocation(embedData.author.name.split('|')[1].trim());
                                        if (userData.locations[activeLocationForIncome]) {
                                            userData.locations[activeLocationForIncome].info.income = income;
                                        }
                                        break;
                                    case 'Prestige':
                                        const activeLocationForPrestige = categorizeLocation(embedData.author.name.split('|')[1].trim());
                                        const prestige = parseInt(field.value.replace(/[^\d]/g, ''));
                                        if (userData.locations[activeLocationForPrestige]) {
                                            userData.locations[activeLocationForPrestige].info.prestige = prestige;
                                        }
                                        break;
                                    case 'Total Multiplier':
                                        const activeLocationForMulti = categorizeLocation(embedData.author.name.split('|')[1].trim());
                                        const multiplier = parseMultiplier(field.value);
                                        if (userData.locations[activeLocationForMulti]) {
                                            userData.locations[activeLocationForMulti].info.multiplier = multiplier;
                                        } else {
                                            console.error(`Invalid or undefined location '${activeLocationForMulti}'`);
                                        }
                                        break;
                                    case 'Multipliers':
                                        const multiplierLines = field.value.split('\n');
                                        multiplierLines.forEach(line => {
                                            const [type, value] = line.split(': ');
                                            const multiplierValue = parseFloat(value.replace(/[^0-9.]/g, ''));
                                            switch (type.trim()) {
                                                case 'Prestige Multiplier':
                                                    userData.locations[activeLocation].stats.multipliers.prestige = multiplierValue;
                                                    break;
                                                case 'Permanent Multiplier':
                                                    userData.locations[activeLocation].stats.multipliers.permanent = multiplierValue;
                                                    break;
                                                case 'Corporation Multiplier':
                                                    userData.locations[activeLocation].stats.multipliers.corporation = multiplierValue;
                                                    break;
                                            }
                                        });
                                        break;
                                    case 'Boosts':
                                        const boostLines = field.value.split('\n');
                                        boostLines.forEach(line => {
                                            const [type, value] = line.split(': ');
                                            switch (type.trim()) {
                                                case 'Daily Income Hours':
                                                    userData.locations[activeLocation].stats.boosts.dailyIncomeHours = parseInt(value.replace(/[^\d]/g, ''));
                                                    break;
                                                case 'Storage Cap':
                                                    userData.locations[activeLocation].stats.boosts.storageCap = parseFloat(value.replace(/[^0-9.]/g, ''));
                                                    break;
                                                case 'Business Cap':
                                                    userData.locations[activeLocation].stats.boosts.businessCap = parseInt(value.replace(/[^\d]/g, ''));
                                                    break;
                                            }
                                        });
                                        break;
                                    case 'Gifting':
                                        const giftingLines = field.value.split('\n');
                                        giftingLines.forEach(line => {
                                            const [type, value] = line.split(': ');
                                            switch (type.trim()) {
                                                case 'Cash Sent':
                                                    userData.locations[activeLocation].stats.gifting.cashSent = parseFloat(value.replace(/[^0-9.]/g, ''));
                                                    break;
                                                case 'Cash Received':
                                                    userData.locations[activeLocation].stats.gifting.cashReceived = parseFloat(value.replace(/[^0-9.]/g, ''));
                                                    break;
                                                case 'Corp. Donations':
                                                    userData.locations[activeLocation].stats.gifting.corpDonations = parseFloat(value.replace(/[^0-9.]/g, ''));
                                                    break;
                                            }
                                        });
                                        break;
                                        case 'Corporation':
                                            userData.info.corporation = removeSpecificEmoji(field.value);
                                            break;
                                        case '🔁 Warps':
                                            // Reset warp values to 0 before populating them with new data
                                            userData.inventory.warps = {
                                                '30min': 0,
                                                '1hr': 0,
                                                '4hr': 0,
                                                '12hr': 0,
                                                '24hr': 0
                                            };
                                        
                                            const warpLines = field.value.split('\n').filter(line => line.trim() !== '' && !line.includes('Total Time'));
                                            warpLines.forEach(line => {
                                                const match = line.match(/`([\d,]+)x` ([\d\w\s]+) Warps?/);
                                                if (match) {
                                                    const amount = parseInt(match[1].replace(/,/g, ''));
                                                    const type = match[2].trim();
                                                    if (type === '30 Minute') {
                                                        userData.inventory.warps['30min'] = amount;
                                                    } 
                                                    if (type === '1 Hour') {
                                                        userData.inventory.warps['1hr'] = amount;
                                                    } 
                                                    if (type === '4 Hour') {
                                                        userData.inventory.warps['4hr'] = amount;
                                                    } 
                                                    if (type === '12 Hour') {
                                                        userData.inventory.warps['12hr'] = amount;
                                                    }
                                                    if (type === '24 Hour') {
                                                        userData.inventory.warps['24hr'] = amount;
                                                    }
                                                } else {
                                                    console.error(`Failed to parse warp item: ${line}`);
                                                }
                                            });
                                            break;
                                        
                                        case '💼 Briefcases':
                                            // Reset briefcase values to 0 before populating them with new data
                                            userData.inventory.briefcases = {
                                                'briefcase': 0,
                                                'boostbriefcase': 0,
                                                'goldenbriefcase': 0
                                            };
                                        
                                            const briefcaseLines = field.value.split('\n').filter(line => line.trim() !== '');
                                            briefcaseLines.forEach(line => {
                                                const match = line.match(/`([\d,]+)x` ([\w\s]+) Briefcases?/);
                                                if (match) {
                                                    const amount = parseInt(match[1].replace(/,/g, ''));
                                                    const type = match[2].trim();
                                                    if (type === 'Briefcase') {
                                                        userData.inventory.briefcases['briefcase'] = amount;
                                                    }  
                                                    if (type === 'Boost Briefcase') {
                                                        userData.inventory.briefcases['boostbriefcase'] = amount;
                                                    } 
                                                    if (type === 'Golden Briefcase') {
                                                        userData.inventory.briefcases['goldenbriefcase'] = amount;
                                                    }
                                                } else {
                                                    console.error(`Failed to parse briefcase item: ${line}`);
                                                }
                                            });
                                            break;
                                        
                                        case '🛒 Loot Boxes':
                                            // Reset lootbox values to 0 before populating them with new data
                                            userData.inventory.lootboxes = {
                                                'silverbox': 0,
                                                'goldbox': 0,
                                                'diamondbox': 0
                                            };
                                        
                                            const lootboxLines = field.value.split('\n').filter(line => line.trim() !== '');
                                            lootboxLines.forEach(line => {
                                                const match = line.match(/`([\d,]+)x` ([\w\s]+) Loot Boxes?/);
                                                if (match) {
                                                    const amount = parseInt(match[1].replace(/,/g, ''));
                                                    const type = match[2].trim();
                                                    if (type === 'Silver Loot Box') {
                                                        userData.inventory.lootboxes['silverbox'] = amount;
                                                    } 
                                                    if (type === 'Gold Loot Box') {
                                                        userData.inventory.lootboxes['goldbox'] = amount;
                                                    }
                                                    if (type === 'Diamond Loot Box') {
                                                        userData.inventory.lootboxes['diamondbox'] = amount;
                                                    }
                                                } else {
                                                    console.error(`Failed to parse lootbox item: ${line}`);
                                                }
                                            });
                                            break;
                                        
                                        case '<:coin:713481704152629290> Coins':
                                            const coinsMatch = field.value.match(/`([\d,]+)x` Coins/);
                                            if (coinsMatch) {
                                                userData.info.coins = parseInt(coinsMatch[1].replace(/,/g, ''), 10);
                                            } else {
                                                console.error(`Failed to parse coins line: ${field.value}`);
                                            }
                                            break;
                                        }
                                    });
                                
                            if (Object.keys(userData).length > 0) {
                                await db.set(`userData.${user.id}`, userData);
                                console.log(`Updated User Data for ${user.id}:`, JSON.stringify(userData, null, 2));
                                const dataSavedEmbed = new EmbedBuilder()
                                    .setColor('#FFFFFF')
                                    .setTitle('Data Saved!')
                                    .setDescription('Your data has been successfully saved.');
                                const buttons = new ActionRowBuilder()
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

                                await message.channel.send({ embeds: [dataSavedEmbed], components: [buttons] });
                            } else {
                                console.log(`Attempted to save empty userData for ${user.id}, operation skipped.`);
                            }
                        });

                        collector.on('end', collected => {
                            if (collected.size === 0) {
                                console.log('No reactions were collected.');
                            }
                        });
                    } catch (error) {
                        console.error("Failed to collect reactions on Idlecapitalist message:", error);
                    }
                }
            }
        });
    }
};
