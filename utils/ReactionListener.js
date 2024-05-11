const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User } = require('discord.js');
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
async function saveOrUpdateUserInfo(userId, userData) {
    const userInfoPath = `userData.${userId}.info`;
    await db.set(userInfoPath, userData);
}

async function CalcGeneralStats(userId, activeLocation) {
    const UserData = await db.get(`userData.${userId}`);
    const LocationData = UserData.locations[activeLocation];

    // const 
}
module.exports = {
    handleIdleCapReactionAdd: async function (client) {



        client.on('messageCreate', async message => {
            
            if (message.author.bot && message.author.id === '512079641981353995') { 
                await delay(1500);
                if (message.embeds.length > 0) {
                    const embed = message.embeds[0];
                    let username = null;  // Declare member variable in the accessible scope
                    if (embed.footer && embed.footer.text) {
                        const footerText = embed.footer.text;
                        // Splitting the footer text into lines and extracting the third line
                        const lines = footerText.split('\n');
                        const usernameLine = lines[2]; // Access the third line
                        username = usernameLine.split('|')[0].trim(); // Assuming the username is before the '|'
                        console.log(`Extracted Username: ${username}`);
                        // if (lines.length >= 3) {
                        //     const usernameLine = lines[2]; // Access the third line
                        //     const username = usernameLine.split('|')[0].trim(); // Assuming the username is before the '|'
                        //     console.log(`Extracted Username: ${username}`);
                        //     try {
                        //         const guild = message.guild; // Get the guild where the message was sent
                        //         const members = await guild.members.fetch({ query: username, limit: 1 });
                        //         if (members.size > 0) {
                        //             member = members.first();  // Assign the found member to the variable
                        //             console.log(`Found User ID: ${member.id} for Username: ${username}`);
                        //         } else {
                        //             console.log(`No member found with Username: ${username}`);
                        //         }
                        //     } catch (error) {
                        //         console.error('Error fetching member:', error);
                        //     }
    
                        // }
                        // Fetch user ID from guild members
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
                            }
                            const embedData = message.embeds[0];
                            const activeLocation = categorizeLocation(embedData.author.name.split('|')[1].trim());
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
                            
                    
                            const reportembed = new EmbedBuilder()
                                .setColor('#FEFFA3') // Yellow
                                .setTitle('Profile Report')
                                .setDescription('Overview of your data')
                                .addFields(
                                    { name: 'General Stats', value: 'PP/Day: ', inline: false },
                                    { name: 'Time to Reach', value: 'Click here', inline: false }
                                );

                                message.channel.send({ embeds: [reportembed] });
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

