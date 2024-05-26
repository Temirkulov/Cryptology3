const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const { defaultProfileData } = require("./ProfileDataStructure");

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

}

const initializeUserData = async (userId) => {
    const defaultUserData = JSON.parse(JSON.stringify(defaultProfileData));  
    defaultUserData.info.userid = userId;
    await db.set(`userData.${userId}`, defaultUserData);
    return defaultUserData;
};
module.exports = {
    handleIdleCapReactionAdd: async function (client) {



        client.on('messageCreate', async message => {
            
            if (message.author.bot && message.author.id === '512079641981353995') { 
                await delay(2000);
                if (message.embeds.length > 0) {
                    const embed = message.embeds[0];
                    let username = null;  // Declare member variable in the accessible scope
                    if (embed.footer && embed.footer.text) {
                        const footerText = embed.footer.text;
                        // Splitting the footer text into lines
                        const lines = footerText.split('\n');
                    
                        // Check if there are enough lines before accessing the third line
                        if (lines.length >= 2) {  // Change this to 2 to match your example array length
                            const usernameLine = lines[1]; // Access the second line instead of the third
                            console.log(lines);
                            console.log(usernameLine);
                            username = usernameLine.split('|')[0].trim(); // Assuming the username is before the '|'
                        } else {
                            console.error('Footer text does not contain enough lines:', footerText);
                            return;
                        }
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
                            let userData = await db.get(`userData.${user.id}`) || await initializeUserData(user.id);                            ;
                            console.log(`User Data for ${user.id}:`, userData);
                            const locationKey = categorizeLocation(embedData.author.name.split('|')[1].trim());

    
                            embedData.fields.forEach(field => {
                                switch (field.name) {
                                    case 'Corporation':
                                        // Store corporation, not necessarily location-specific
                                        userData.info.corporation = field.value.replace(/[\u{1F3E0}-\u{1F6FF}]/gu, '').trim();
                                        break;
                                    case 'Briefcases':
                                        // Store briefcases, not necessarily location-specific
                                        userData.info.briefcases = parseInt(field.value.replace(/[^\d]/g, ''));
                                        break;
                                    case 'Coins':
                                        // Store coins, not necessarily location-specific
                                        userData.info.coins = parseValue(field.value);
                                    case 'Balance':
                                        // Extract balance and assign to specific location
                                        const balance = parseValue(field.value);
                                        const activeLocationForBalance = categorizeLocation(embedData.author.name.split('|')[1].trim());
                                        console.log(`Active Location for Balance: ${activeLocationForBalance}`);
                                        if (userData.locations[activeLocationForBalance]) {
                                            userData.locations[activeLocationForBalance].balance = balance;
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
                            
                                    case 'Corporation':
                                        
                                    case 'Prestige':
                                        // Example of handling prestige which is typically not location-specific
                                        const prestige = parseInt(field.value.replace(/[^\d]/g, ''));
                                        userData.info.prestige = prestige;
                                        break;
                            
                                    // You can continue to handle other fields similarly
                                }
                            });
                            
                            await db.set(`userData.${user.id}`, userData);
                            console.log(`Updated User Data for ${user.id}:`, userData);

                    
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

