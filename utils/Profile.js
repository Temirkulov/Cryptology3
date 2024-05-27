const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

async function createProfileEmbed(interaction, userId, userData) {
    const activeLocation = userData.info.activeLocation || 'earth';
    const locationData = userData.locations[activeLocation] || { info: {}, balance: 0, income: 0 };
    const prestigeLevel = locationData.info.prestige || 0;
    const balance = locationData.info.balance || 0;
    const income = locationData.info.income || 0;
    const dailyIncome = income * 24 * 60; // Assuming income is per hour

    const ppCost = (2000 * Math.pow(prestigeLevel, 3)) + (10000 * Math.pow(prestigeLevel, 2));
    const ppp = ppCost ? balance / ppCost : 0;
    const ppd = ppCost ? dailyIncome / ppCost : 0;
    const formatNumber = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return new EmbedBuilder()
        .setColor('#FEFFA3') // Yellow
        .setTitle('Profile Report')
        .setDescription('Overview of your data')
        .setThumbnail(interaction.user.displayAvatarURL()) // Set user's avatar
        .addFields(
            { name: 'User', value: `Username: ${userData.info.username}\nCorporation: ${userData.info.corporation}\n**Active Location:** ${userData.info.activeLocation || 'N/A'}` || 'N/A', inline: false },
            { name: 'General Stats', value: 
                `**Coins:** ${formatNumber(userData.info.coins)}\n` +
                `**Briefcases:** ${formatNumber(userData.info.briefcases)}\n` +
                `**Prestige:** ${userData.info.prestige.toString()}`, inline: false },
            { name: 'Location Stats', value: 
                `**Balance:** ${formatNumber(locationData.info.balance)}\n` +
                `**Income per Day:** ${formatNumber(dailyIncome)}\n` +
                `**Prestige Points:** ${formatNumber(ppp)}\n` +
                `**Pres. Points/Day:** ${formatNumber(ppd)}`, inline: false }
        );
}


module.exports = {
    profileHandler: function (client) {
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
                        .setLabel('Forecast Report')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('profile')
                        .setLabel('Profile Report')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [profileEmbed], components: [row] });
        });
    }
};
