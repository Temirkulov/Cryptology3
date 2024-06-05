const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { defaultProfileData } = require("./ProfileDataStructure");
const businessData = require("./businessData.json");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function parseValue(value) {
    return parseFloat(value.replace(/[^0-9.-]+/g, ''));
}

async function saveCorporationData(embed) {
    const fields = embed.fields.reduce((acc, field) => {
        acc[field.name.toLowerCase().replace(/\s+/g, '_')] = field.value;
        return acc;
    }, {});

    const corporationData = {
        name: embed.title,
        ceo: fields['ceo'] || 'N/A',
        managers: fields['managers'] ? fields['managers'].split(', ') : [],
        employees: parseValue(fields['employees'] || '0'),
        level: parseValue(fields['level'] || '0'),
        reputation_level: parseValue(fields['reputation_level'] || '0'),
        cash: parseValue(fields['cash'] || '0'),
        income: parseValue(fields['income'] || '0'),
        multiplier: parseValue(fields['multiplier'] || '0').toFixed(2),
        daily_boost: parseValue(fields['daily_boost'] || '0'),
        footer: embed.footer ? embed.footer.text : null,
        timestamp: new Date().toISOString()
    };

    const corporationName = corporationData.name;
    await db.set(`corporationData.${corporationName}`, corporationData);
    console.log(`Corporation data for ${corporationName} saved successfully.`);
    console.log(`Corporation data:`, JSON.stringify(corporationData, null, 2));
}

async function getUserIdByUsername(username) {
    const allUsers = await db.get('userData') || {};
    console.log('All users in database:', Object.keys(allUsers)); // Log all user IDs for debugging

    for (const [userId, userData] of Object.entries(allUsers)) {
        console.log(`Checking user: ${userData.info.username} against ${username}`); // Log the comparison

        if (userData.info.username.toLowerCase() === username.toLowerCase()) {
            console.log(`Found matching user: ${username} with ID: ${userId}`);
            return userId;
        }
    }
    return null;
}

async function updateUserBusinessData(userId, embed) {
    const userDataPath = `userData.${userId}`;
    let userData = await db.get(userDataPath) || JSON.parse(JSON.stringify(defaultProfileData));

    // Determine active location from the embed footer
    const locationMatch = embed.footer.text.match(/\|\s+(\w+)/);
    const activeLocation = locationMatch ? locationMatch[1].toLowerCase() : 'earth';

    // Extract balance from the footer
    const balanceMatch = embed.footer.text.match(/Balance:\s+\$([\d,]+)/);
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : 0;
    userData.locations[activeLocation].info.balance = balance;

    // Extract income from the footer
    const incomeMatch = embed.footer.text.match(/Income:\s+\$([\d,.]+)\/min/);
    const income = incomeMatch ? parseFloat(incomeMatch[1].replace(/,/g, '')) : 0;
    userData.locations[activeLocation].info.income = income;

    // Initialize businesses if not present
    if (!userData.locations[activeLocation].businesses) {
        userData.locations[activeLocation].businesses = {};
    }

    const businessLines = embed.description.split('\n\n');
    businessLines.forEach(line => {
        const idMatch = line.match(/ID: `(\w+)`/);
        const ownMatch = line.match(/You own: `([\d,]+)`/);

        if (idMatch && ownMatch) {
            const businessId = idMatch[1];
            const ownedAmount = parseInt(ownMatch[1].replace(/,/g, ''));

            // Update or add the business amount
            userData.locations[activeLocation].businesses[businessId] = ownedAmount;
        }
    });

    await db.set(userDataPath, userData);
    console.log(`User data for ${userId} updated successfully.`);
    console.log(`User data:`, JSON.stringify(userData, null, 2));
}

async function initializeUserData(userId, username) {
    const defaultUserData = JSON.parse(JSON.stringify(defaultProfileData));
    defaultUserData.info.userid = userId;
    defaultUserData.info.username = username;
    await db.set(`userData.${userId}`, defaultUserData);
    return defaultUserData;
}

module.exports = {
    handleIdleCapMessageCreate: function (client) {
        client.on('messageCreate', async message => {
            if (message.author.bot && message.author.id === '512079641981353995') {
                await delay(2000);
                const embed = message.embeds[0];

                if (message.embeds.length > 0) {
                
                if (!embed.author || !embed.author.name.includes('Businesses')) return;
                await message.react('📋');
                console.log("Reacted to message with 📋");

                const filter = (reaction, user) => reaction.emoji.name === '📋' && !user.bot;
                const collector = message.createReactionCollector({ filter, max: 1, time: 15000 });

                collector.on('collect', async (reaction, user) => {
                    console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);

                    const footerLines = message.embeds[0].footer.text.split('\n');
                    const lastLine = footerLines[footerLines.length - 1];
                    const [username, location] = lastLine.split(' | ');

                    console.log(`Extracted username: ${username}, location: ${location}`);

                    const userId = await getUserIdByUsername(username.trim());
                    if (userId) {
                        await updateUserBusinessData(userId, message.embeds[0]);

                        const dataSavedEmbed = new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .setTitle('Data Saved!')
                            .setDescription('Your data has been successfully saved.');

                        const buttons = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                .setCustomId('analysis')
                                .setLabel('Analysis')
                                .setStyle(ButtonStyle.Success),
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
                        console.log(`No matching user found for username: ${username}`);
                    }
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        console.log('No reactions were collected.');
                    }
                });
            } else return;
        }
        });
    },

    handleIdleCapMessageUpdate: function (client) {
        const analysis = require('./Analysis.js');
        // Inside the appropriate handler
        analysis.analysisHandler(client);

        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (newMessage.author.bot && newMessage.author.id === '512079641981353995') {

                console.log('Message updated by bot detected.');
                // Check if there's at least one embed in the updated message
                if (newMessage.embeds.length > 0) {
                    const updatedEmbed = newMessage.embeds[0];
                    console.log(`Updated Embed: ${updatedEmbed.title || 'No Title'}`);

                    if (!updatedEmbed.author || !updatedEmbed.author.name.includes('Businesses')) return;

                    // Extract username from footer
                    const footerLines = updatedEmbed.footer.text.split('\n');
                    const lastLine = footerLines[footerLines.length - 1];
                    const [username, location] = lastLine.split(' | ');

                    console.log(`Extracted username: ${username}, location: ${location}`);

                    if (username) {
                        const userId = await getUserIdByUsername(username.trim());
                        if (userId) {
                            await updateUserBusinessData(userId, updatedEmbed);
                        } else {
                            console.log(`No matching user found for username: ${username}`);
                        }
                    } else {
                        console.log('No username found in footer.');
                    }

                    // Log the fields for debugging purposes
                    if (updatedEmbed.fields && updatedEmbed.fields.length > 0) {
                        updatedEmbed.fields.forEach((field, index) => {
                            console.log(`${index + 1}: ${field.name} - ${field.value}`);
                        });
                    } else {
                        console.log('No fields in this embed.');
                    }
                } else {
                    console.log('No embeds found in the updated message.');
                }
            }
        });
    }
};
