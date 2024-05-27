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
    inventory:{
        warps:{},
        briefcases:{},
        lootboxes:{},
    },
    boosts:{},

};


module.exports = { defaultProfileData };
