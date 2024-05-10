module.exports = {
    handleIdleCapMessageCreate: function (client) {
        client.on('messageCreate', message => {
            if (message.author.bot && message.author.id === '512079641981353995') {
                setTimeout(() => {
                    console.log("Checking message after delay:", message.content); // Log message content for debugging
                    if (message.embeds.length > 0) {
                        const embed = message.embeds[0];
                        console.log("Found embed:", embed); // Log the entire embed for debugging
                        embed.fields.forEach((field, index) => {
                            console.log(`Field ${index + 1}: Name: ${field.name}, Value: ${field.value}`)});            
        
                        if (embed.title ) {
                            // The embed has an author name or title, reply with it
                            // message.reply({ content: embed.title });
                            console.log({ content: embed.title });
                        } else {
                            // The embed does not have an author name
                            console.log({ content: "No author name" });
                        }
                    } else {
                        console.log("No embeds found in this message.");
                    }
                }, 3000); // Delay of 3000 milliseconds (3 seconds)
            }
        });
    },

    handleIdleCapMessageUpdate: function (client) {
        client.on('messageUpdate', (oldMessage, newMessage) => {
            if (newMessage.author.bot && newMessage.author.id === '512079641981353995') {
                // Check if there's at least one embed in the updated message
                if (newMessage.embeds.length > 0) {
                    const updatedEmbed = newMessage.embeds[0];
                    console.log(`Updated Embed: ${updatedEmbed.title || 'No Title'}`);
                    // Check if there are fields to log
                    if (updatedEmbed.fields && updatedEmbed.fields.length > 0) {
                        console.log('Fields:');
                        updatedEmbed.fields.forEach((field, index) => {
                            console.log(`${index + 1}: ${field.name} - ${field.value}`);
                        });
                    } else {
                        console.log('No fields in this embed.');
                    }
                    // If you're specifically looking for changes in the embed (e.g., description, fields),
                    // you would compare `oldMessage.embeds` with `newMessage.embeds` here
                    if (oldMessage.embeds.length > 0) {
                        const embed = oldMessage.embeds[0];
                        // Example comparison (can be expanded based on what changes you expect)
                        // Check if this embed has fields
                        if (embed.fields && embed.fields.length > 0) {
                            embed.fields.forEach((field, fieldIndex) => {
                                console.log(`Field ${fieldIndex + 1}: Name: ${field.name}, Value: ${field.value}`);
                            });
                        } else {
                            console.log("This embed has no fields.");
                        }
        
                        // Additional comparison logic can be implemented as needed,
                        // such as comparing the `fields` array if that's what the bot updates.
                    }
                }
            }
        });
    }
};
