const defaultProfileData = {
    info: {
        username: "",
        userid: "",
        corporation: "",
        prestige: 0,
        activeLocation: "",
        coins: 0,
        briefcases: 0,
    },
    locations: {
        earth: {info:{},stats:{multipliers:{},boosts:{},gifting:{}},businesses:{}},
        moon: {info:{},stats:{multipliers:{},boosts:{},gifting:{}},businesses:{}},
        mars: {info:{},stats:{multipliers:{},boosts:{},gifting:{}},businesses:{}},
        rush_colony: {info:{},stats:{multipliers:{},boosts:{},gifting:{}},businesses:{}}
    },
    inventory: {
        warps: {
            '30min': 0,
            '1hr': 0,
            '4hr': 0,
            '12hr': 0,
            '24hr': 0
        },
        briefcases: {
            'briefcase': 0,
            'boostbriefcase': 0,
            'goldenbriefcase': 0
        },
        lootboxes: {
            'silverbox': 0,
            'goldbox': 0,
            'diamondbox': 0
        }
    },
    boosts:{},

};


module.exports = { defaultProfileData };
