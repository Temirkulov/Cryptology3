const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const { defaultProfileData } = require("./ProfileDataStructure");
const { sendProfileReport, sendForecastReport } = require('./Profile');

function userExistsInData(userId) {
    // Implement checking logic here
    return false; // Or true based on actual data check
}

function saveUserData(user, userData) {
    // Implement user data saving logic here
}

function sendWarningEmbed(channel) {
    const embed = new EmbedBuilder()
        .setColor(0xFF0000) // RED
        .setTitle('Warning!')
        .setDescription('Your data is not found, please register first!');
    channel.send({ embeds: [embed] });
}

function sendConfirmationEmbed(channel, user) {
    const embed = new EmbedBuilder()
        .setColor(0x00FF00) // GREEN
        .setTitle('Data Saved!')
        .setDescription('Your data has been successfully saved.')
        .addFields(
            { name: 'View Report', value: 'Click here', inline: true },
            { name: 'View Stats', value: 'Click here', inline: true }
        );
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('view_report')
                .setLabel('View Report')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('view_stats')
                .setLabel('View Stats')
                .setStyle(ButtonStyle.Primary)
        );
    channel.send({ embeds: [embed], components: [row] });
}
function parseValue(value) {
    // Remove custom Discord emojis like <:coin:713481704152629290> and other non-numeric characters except for decimal point and minus sign
    const cleanedValue = value.replace(/<:[^:]+:\d+>/g, '').replace(/[^\d.-]/g, '');
    return cleanedValue.includes('.') ? parseFloat(cleanedValue) : parseInt(cleanedValue);
}
function categorizeLocation(locationString) {
    const keywordToLocation = {
        "Earth": "earth",
        "Moon": "moon",
        "Mars": "mars",
        "Rush Colony": "rush_colony",  // Using underscore for consistency in coding style
    };

    // Attempt to match location string to one of the keywords
    for (const [keyword, location] of Object.entries(keywordToLocation)) {
        if (locationString.includes(keyword)) {
            return location;
        }
    }

    // Return a default or error identifier if no match is found
    return "unknown_location";  // Good for handling cases where location isn't recognized
}

// // Example usage:
// const locationString = "Exploring Mars Base";
// const location = categorizeLocation(locationString);  // returns 'mars'
// console.log(location);  // Outputs 'mars'
async function updateLocationData(userId, activeLocation, newLocationData) {
    // Retrieve existing userData from the database or initialize if it doesn't exist
    const userDataPath = `userData.${userId}`;
    let userData = await db.get(userDataPath) || { info: {}, locations: {} };
    console.log(JSON.stringify(userData, null, 2));
    // Update the location-specific data
    if (!userData.locations[activeLocation]) {
        userData.locations[activeLocation] = {};
    }
    userData.locations[activeLocation] = {
        ...userData.locations[activeLocation],
        ...newLocationData
    };

    // Save the updated userData back to the database
    await db.set(userDataPath, userData);
    console.log(JSON.stringify(userData, null, 2));    
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


module.exports = {
    handleIdleCapReactionAdd: async function (client) {
        const profile = require('./Profile.js');
        // const analysis = require('./Analysis.js');
        // Call the exported functions from each module
        profile.profileHandler(client);
        const prestige_report = require('./prestige_report.js');
        prestige_report.prestigeReportHandler(client);    

        // analysis.analysisHandler(client);
        // client.on('interactionCreate', async (interaction) => {
        //     if (interaction.isButton() && interaction.customId === 'profile') {
        //         await profileHandler(interaction);
        //     }
        // });



        client.on('messageCreate', async message => {
            
            if (message.author.bot && message.author.id === '512079641981353995') { 
                await delay(2000);
                if (message.embeds.length > 0) {
                    const embed = message.embeds[0];
                    console.log(embed);
                    let username = null;  // Declare member variable in the accessible scope
                    if (embed.footer && embed.footer.text) {
                        const footerText = embed.footer.text;
                        // Splitting the footer text into lines
                        const lines = footerText.split('\n');
                    
                        // Check if there are enough lines before accessing the third line
                        if (embed.footer && embed.footer.text) {
                            const footerText = embed.footer.text;
                            const lines = footerText.split('\n');
                        
                            let usernameLine;
                            if (lines.length === 1) {
                                // Footer has only one line
                                usernameLine = lines[0];
                            } else if (lines.length === 2) {
                                // Footer has two lines, username is on the second line
                                usernameLine = lines[1];
                            } else if (lines.length >= 3) {
                                // Footer has three or more lines, username is on the third line
                                usernameLine = lines[2];
                            } else {
                                console.error('Footer text does not contain enough lines:', footerText);
                                return;
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
                            if(user.username == username) {
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
                            console.log(`Active Location: ${activeLocation}`);  // Outputs the location identifier (e.g., 'mars'
                            // const userData = {
                            //     info: {
                            //     username: embedData.author.name.split('|')[0].trim(),
                            //     userid: member.id,
                            //     activeLocation: embedData.author.name.split('|')[1].trim(),
                            //     corporation: embedData.fields[0].value.replace(/[\u{1F3E0}-\u{1F6FF}]/gu, '').trim(), // Strip emojis from corporation name
                            //     coins: parseValue(embedData.fields[5].value),
                            //     briefcases: parseInt(embedData.fields[6].value.replace(/[^\d]/g, '')), // Briefcases are likely whole numbers
                            //         },
                            // }
                            // const newLocationData = {
                            //     balance: parseValue(embedData.fields[1].value),
                            //     income: parseValue(embedData.fields[2].value),
                            //     prestige: parseInt(embedData.fields[3].value.replace(/[^\d]/g, '')),
                            //     prestigePoints: parseValue(embedData.fields[4].value),
                            //     multiplier: parseFloat(embedData.fields[7].value.replace(/[^\d.]/g, ''))
                            // };
                            let userData = await db.get(`userData.${user.id}`) || await initializeUserData(user.id);                            ;
                            console.log(`User Data for ${user.id}:`, userData);
                            let usernameLine;
                            if (lines.length === 1) {
                                // Footer has only one line
                                usernameLine = lines[0];
                            } else if (lines.length === 2) {
                                // Footer has two lines, username is on the second line
                                usernameLine = lines[1];
                            } else if (lines.length >= 3) {
                                // Footer has three or more lines, username is on the third line
                                usernameLine = lines[2];
                            } else {
                                console.error('Footer text does not contain enough lines:', footerText);
                                return;
                            }

                            username = usernameLine.split('|')[0].trim();
                            const locationPart = usernameLine.split('|')[1].trim();
                            const locationKey = categorizeLocation(locationPart);
                            console.log(`Active Location: ${locationKey}`);  // Outputs the location identifier (e.g., 'mars')
                            userData.info.username = user.username;
                            userData.info.activeLocation = locationKey;
                            embedData.fields.forEach(field => {
                                switch (field.name) {
                                    case 'Corporation':
                                        // Store corporation, not necessarily location-specific
                                        userData.info.corporation = removeSpecificEmoji(field.value);
                                        console.log(`Corporation: ${userData.info.corporation}`);
                                        break;
                                    case 'Briefcases':
                                        // Store briefcases, not necessarily location-specific
                                        userData.info.briefcases = parseInt(field.value.replace(/[^\d]/g, ''));
                                        break;
                                    case 'Coins':
                                            // Extract and parse the coin value
                                            const coinsString = field.value.replace(/<:[^:]+:\d+>/g, '').replace(/[^\d]/g, '');
                                            userData.info.coins = parseInt(coinsString);
                                            break;
                                    case 'Balance':
                                            // Extract balance and assign to specific location
                                            const balanceString = field.value.replace(/[^\d.-]/g, ''); // Remove everything except digits, dots, and hyphens
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
                                        // Handle income in a similar manner
                                        const income = parseValue(field.value);
                                        const activeLocationForIncome = categorizeLocation(embedData.author.name.split('|')[1].trim());
                                        if (userData.locations[activeLocationForIncome]) {
                                            userData.locations[activeLocationForIncome].info.income = income;
                                        }
                                        break;
                                                                    
                                    case 'Prestige':
                                        // Example of handling prestige which is typically not location-specific
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
                                    }
                            });
                            
                            if (Object.keys(userData).length > 0) {
                                await db.set(`userData.${user.id}`, userData);
                                console.log(`Updated User Data for ${user.id}:`, JSON.stringify(userData, null, 2));                            const dataSavedEmbed = new EmbedBuilder()
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
                    
                        // Send the embed and buttons as a response
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
                } else return;
            } 
        }
        });
    }
};

