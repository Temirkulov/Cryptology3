const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        // Calculating the ping
        const botPing = Date.now() - interaction.createdTimestamp;

        // Create an embed
        const pingEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Pong! 🏓')
            .setDescription(`Hello <@${interaction.user.id}>, the ping is ${botPing}ms.`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true })) // Add this line to set the thumbnail to the user's avatar
            .setTimestamp()
            .setFooter({ 
                text: 'Sample Footer Text', 
                iconURL: 'https://cdn.discordapp.com/avatars/1220012253101686874/05b6582fc701f6d1a54d100d6d0cb6ba.png' 
            });

        // Reply with the embed
        await interaction.reply({ embeds: [pingEmbed] });
    },
};
