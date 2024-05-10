module.exports = {
    handleIdleCapReactionAdd: async function (client) {
        client.on('messageCreate', async message => {
            if (message.author.bot && message.author.id === '512079641981353995') {
                console.log("Reacting to Idlecapitalist bot message...");

                try {
                    await message.react('📋');
                    console.log("Awaiting reactions to Idlecapitalist bot message...");
                    
                    // Define reaction filter specific to Idlecapitalist
                    const filter = (reaction, user) => reaction.emoji.name === '📋' && !user.bot;
                    const collected = await message.awaitReactions({ filter, max: 1, time: 10000 });
                    const reaction = collected.first();
                    
                    if (reaction) {
                        const user = reaction.users.cache.filter(u => !u.bot).first();
                        console.log(`Successfully collected ${reaction.emoji.name} from ${user.tag} on Idlecapitalist message.`);
                        // Proceed with Idlecapitalist specific logic here
                    }
                } catch (error) {
                    console.error("Failed to collect reactions on Idlecapitalist message:", error);
                }
            }
        });
    }
};
