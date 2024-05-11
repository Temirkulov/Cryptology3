const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

module.exports = {
    handleIdleCapReactionAdd: async function (client) {



        client.on('messageCreate', async message => {
            if (message.author.bot && message.author.id === '512079641981353995') { 
                await delay(2000);
                if (message.embeds.length > 0) {
                    try {
                        await message.react('📋');
                        console.log("Awaiting reactions to Idlecapitalist bot message...");

                        const filter = (reaction, user) => reaction.emoji.name === '📋' && !user.bot;
                        const collector = message.createReactionCollector({ filter, max: 1, time: 15000 });

                        collector.on('collect', async (reaction, user) => {
                            console.log(`Successfully collected ${reaction.emoji.name} from ${user.tag} on Idlecapitalist message.`);

                            const embedData = message.embeds[0];
                            const userData = {
                                username: embedData.author.name.split('|')[0].trim(),
                                location: embedData.author.name.split('|')[1].trim(),
                                corporation: embedData.fields[0].value,
                                balance: embedData.fields[1].value,
                                income: embedData.fields[2].value,
                                prestige: embedData.fields[3].value,
                                prestigePoints: embedData.fields[4].value,
                                coins: embedData.fields[5].value,
                                briefcases: embedData.fields[6].value,
                                multiplier: embedData.fields[7].value
                            };

                            if (!userExistsInData(user.id)) {
                                sendWarningEmbed(message.channel);
                            } else {
                                saveUserData(user, userData);
                                sendConfirmationEmbed(message.channel, user);
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

