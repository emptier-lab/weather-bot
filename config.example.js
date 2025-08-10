module.exports = {
  discord: {
    token: "YOUR_DISCORD_TOKEN_HERE",
    groupChatId: "YOUR_GROUP_CHAT_ID_HERE"
  },

  radar: {
    rowsPerMessage: 7,
    mapHeight: 21,
    mapWidth: 22,
    animationSpeed: 300,
    updateInterval: 300000
  },

  defaultLocation: {
    name: "Katy, TX",
    latitude: 29.785786,
    longitude: -95.824394
  },

  weather: {
    emojis: {
      clear: "⬜",
      lightRain: "🟦",
      moderateRain: "🟩",
      heavyRain: "🟨",
      veryHeavyRain: "🟧",
      severeStorm: "🟥",
      hail: "🟪",
      tornado: "⬛"
    },

    stormEmojis: {
      lightClouds: "⚪",
      lightRain: "🔵",
      moderateRain: "🟢",
      heavyRain: "🟡",
      veryHeavyRain: "🟠",
      severe: "🔴",
      hail: "🟣",
      tornado: "💢"
    }
  },

  api: {
    weatherUrl: "https://api.open-meteo.com/v1/forecast",
    geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
    requestTimeout: 10000,
    retryAttempts: 3
  },

  logging: {
    level: "info",
    enableConsoleOutput: true,
    enableFileOutput: false,
    logDirectory: "./logs"
  }
};
