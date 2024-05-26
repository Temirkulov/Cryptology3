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
        earth: {info:{},businesses:{}},
        moon: {info:{},businesses:{}},
        mars: {info:{},businesses:{}},
        rush_colony: {info:{},businesses:{}}
    },
    inventory:{
        warps:{},
        briefcases:{},
        lootboxes:{},
    },
    boosts:{},
    stats: {
        multipliers:{},
        boosts:{},
        gifting:{},
    }

};


module.exports = { defaultProfileData };
