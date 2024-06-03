const { QuickDB } = require("quick.db");
const db = new QuickDB();


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



module.exports = {
    handleIdleCapMessageCreate: function (client) {
        client.on('messageCreate', message => {
            if (message.author.bot && message.author.id === '512079641981353995') {
                setTimeout(() => {
                    console.log("Checking message after delay:", message.content); // Log message content for debugging
                    if (message.embeds.length > 0) {
                        const embed = message.embeds[0];
                        // console.log("Found embed:", embed); // Log the entire embed for debugging
                        embed.fields.forEach((field, index) => {
                            // console.log(`Field ${index + 1}: Name: ${field.name}, Value: ${field.value}`)
                        });            
        
                        if (embed.title ) {
                            // The embed has an author name or title, reply with it
                            // message.reply({ content: embed.title });
                            // console.log({ content: embed.title });
                        } else {
                            // The embed does not have an author name
                            // console.log({ content: "No author name" });
                        }
                    } else {
                        // console.log("No embeds found in this message.");
                    }
                }, 1500); // Delay of 3000 milliseconds (3 seconds)
            }
        });
    },

    handleIdleCapMessageUpdate: function (client) {
        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (newMessage.author.bot && newMessage.author.id === '512079641981353995') {
                // Check if there's at least one embed in the updated message
                if (newMessage.embeds.length > 0) {
                    const updatedEmbed = newMessage.embeds[0];
                    // console.log(`Updated Embed: ${updatedEmbed.title || 'No Title'}`);
                    
                    // Check if the embed has the required fields
                    const hasCEO = updatedEmbed.fields.some(field => field.name.includes('CEO'));
                    const hasManagers = updatedEmbed.fields.some(field => field.name.includes('Managers'));

                    if (hasCEO && hasManagers) {
                        await saveCorporationData(updatedEmbed);
                    }
                    

                    // Log the fields for debugging purposes
                    if (updatedEmbed.fields && updatedEmbed.fields.length > 0) {
                        updatedEmbed.fields.forEach((field, index) => {
                            console.log(`${index + 1}: ${field.name} - ${field.value}`);
                        });
                    } else {
                        console.log('No fields in this embed.');
                    }

                    // Example comparison logic for old message
                    if (oldMessage.embeds.length > 0) {
                        const oldEmbed = oldMessage.embeds[0];
                        if (oldEmbed.fields && oldEmbed.fields.length > 0) {
                            oldEmbed.fields.forEach((field, fieldIndex) => {
                                console.log(`Old Field ${fieldIndex + 1}: Name: ${field.name}, Value: ${field.value}`);
                            });
                        } else {
                            console.log("This embed has no fields.");
                        }
                    }
                }
            }
        });
    }
};
