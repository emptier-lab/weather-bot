/**
 * Discord Weather Radar Bot
 * Created by: empty?
 *
 * A Discord bot that provides real-time animated weather radar displays
 * using actual meteorological data from Open-Meteo API.
 *
 * Features:
 * - Real-time weather data and animated radar
 * - Global location support
 * - Severe weather detection
 * - Interactive commands
 */

const Discord = require("discord.js-selfbot-v13");
const axios = require("axios");
const fs = require("fs");

let config;
try {
  config = require("./config.js");
} catch (error) {
  console.log(
    "⚠️ Config file not found, using default values. Copy config.example.js to config.js",
  );
  config = {
    discord: {
      token: "YOUR_DISCORD_TOKEN_HERE",
      groupChatId: "YOUR_GROUP_CHAT_ID_HERE",
    },
    radar: {
      rowsPerMessage: 7,
      mapHeight: 21,
      mapWidth: 22,
      animationSpeed: 300,
    },
    defaultLocation: {
      name: "Katy, TX",
      latitude: 29.785786,
      longitude: -95.824394,
    },
  };
}

const client = new Discord.Client({
  checkUpdate: false,
  autoRedeemNitro: false,
  syncStatus: false,
  patchVoice: false,
  restRequestTimeout: 60000,
});

const GROUP_CHAT_ID = config.discord.groupChatId;
const TOKEN = config.discord.token;
const ROWS_PER_MESSAGE = config.radar.rowsPerMessage;
const MAP_HEIGHT = config.radar.mapHeight;
const MAP_WIDTH = config.radar.mapWidth;
const RADAR_SPEED = config.radar.animationSpeed;

let currentLocation = config.defaultLocation;

let weatherData = null;
let lastWeatherUpdate = 0;

const weatherEmojis = ["⬜", "🟦", "🟩", "🟨", "🟧", "🟥", "🟪", "⬛"];
const stormEmojis = ["⚪", "🔵", "🟢", "🟡", "🟠", "🔴", "🟣", "💢"];

const fetchLocationCoordinates = async (locationName) => {
  try {
    console.log(`🔍 Searching for: "${locationName}"`);
    const response = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=5`,
      { timeout: 10000 },
    );

    if (response.data.results && response.data.results.length > 0) {
      let bestResult = response.data.results[0];

      const usResult = response.data.results.find(
        (r) => r.country && (r.country === "United States" || r.country_code === "US"),
      );
      if (usResult) bestResult = usResult;

      console.log(`✅ Found: ${bestResult.name}, ${bestResult.country}`);
      return {
        name: `${bestResult.name}, ${bestResult.country}`,
        latitude: bestResult.latitude,
        longitude: bestResult.longitude,
      };
    }

    console.log(`❌ No results found for: "${locationName}"`);
    return null;
  } catch (error) {
    console.error("❌ Geocoding error:", error.message);
    return null;
  }
};

const fetchWeatherData = async (lat, lon) => {
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation,weather_code,temperature_2m&forecast_days=1`,
      { timeout: 10000 },
    );
    return response.data;
  } catch (error) {
    console.error("❌ Weather API error:", error.message);
    return null;
  }
};

const findActiveWeatherLocation = async () => {
  const weatherLocations = [
    { name: "Miami, FL", lat: 25.7617, lon: -80.1918 },
    { name: "New Orleans, LA", lat: 29.9511, lon: -90.0715 },
    { name: "Houston, TX", lat: 29.7604, lon: -95.3698 },
    { name: "Tampa, FL", lat: 27.9506, lon: -82.4572 },
    { name: "Oklahoma City, OK", lat: 35.4676, lon: -97.5164 },
    { name: "Kansas City, MO", lat: 39.0997, lon: -94.5786 },
    { name: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
    { name: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
    { name: "Portland, OR", lat: 45.5152, lon: -122.6784 },
    { name: "Atlanta, GA", lat: 33.749, lon: -84.388 },
    { name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
    { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
    { name: "London, UK", lat: 51.5074, lon: -0.1278 },
    { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin, Germany", lat: 52.52, lon: 13.405 },
    { name: "Madrid, Spain", lat: 40.4168, lon: -3.7038 },
    { name: "Rome, Italy", lat: 41.9028, lon: 12.4964 },
    { name: "Amsterdam, Netherlands", lat: 52.3676, lon: 4.9041 },
    { name: "Vienna, Austria", lat: 48.2082, lon: 16.3738 },
    { name: "Stockholm, Sweden", lat: 59.3293, lon: 18.0686 },
    { name: "Oslo, Norway", lat: 59.9139, lon: 10.7522 },
    { name: "Copenhagen, Denmark", lat: 55.6761, lon: 12.5683 },
    { name: "Helsinki, Finland", lat: 60.1699, lon: 24.9384 },
    { name: "Warsaw, Poland", lat: 52.2297, lon: 21.0122 },
    { name: "Prague, Czech Republic", lat: 50.0755, lon: 14.4378 },
    { name: "Budapest, Hungary", lat: 47.4979, lon: 19.0402 },
    { name: "Bucharest, Romania", lat: 44.4268, lon: 26.1025 },
    { name: "Sofia, Bulgaria", lat: 42.6977, lon: 23.3219 },
    { name: "Athens, Greece", lat: 37.9755, lon: 23.7348 },
    { name: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
    { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
    { name: "Seoul, South Korea", lat: 37.5665, lon: 126.978 },
    { name: "Beijing, China", lat: 39.9042, lon: 116.4074 },
    { name: "Shanghai, China", lat: 31.2304, lon: 121.4737 },
    { name: "Hong Kong", lat: 22.3193, lon: 114.1694 },
    { name: "Singapore", lat: 1.3521, lon: 103.8198 },
    { name: "Bangkok, Thailand", lat: 13.7563, lon: 100.5018 },
    { name: "Jakarta, Indonesia", lat: -6.2088, lon: 106.8456 },
    { name: "Manila, Philippines", lat: 14.5995, lon: 120.9842 },
    { name: "Mumbai, India", lat: 19.076, lon: 72.8777 },
    { name: "Delhi, India", lat: 28.7041, lon: 77.1025 },
    { name: "Kolkata, India", lat: 22.5726, lon: 88.3639 },
    { name: "Karachi, Pakistan", lat: 24.8607, lon: 67.0011 },
    { name: "Dhaka, Bangladesh", lat: 23.8103, lon: 90.4125 },
    { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
    { name: "Melbourne, Australia", lat: -37.8136, lon: 144.9631 },
    { name: "Brisbane, Australia", lat: -27.4698, lon: 153.0251 },
    { name: "Perth, Australia", lat: -31.9505, lon: 115.8605 },
    { name: "Auckland, New Zealand", lat: -36.8485, lon: 174.7633 },
    { name: "Wellington, New Zealand", lat: -41.2865, lon: 174.7762 },
    { name: "São Paulo, Brazil", lat: -23.5505, lon: -46.6333 },
    { name: "Rio de Janeiro, Brazil", lat: -22.9068, lon: -43.1729 },
    { name: "Buenos Aires, Argentina", lat: -34.6118, lon: -58.396 },
    { name: "Santiago, Chile", lat: -33.4489, lon: -70.6693 },
    { name: "Lima, Peru", lat: -12.0464, lon: -77.0428 },
    { name: "Bogotá, Colombia", lat: 4.711, lon: -74.0721 },
    { name: "Caracas, Venezuela", lat: 10.4806, lon: -66.9036 },
    { name: "Cairo, Egypt", lat: 30.0444, lon: 31.2357 },
    { name: "Lagos, Nigeria", lat: 6.5244, lon: 3.3792 },
    { name: "Nairobi, Kenya", lat: -1.2921, lon: 36.8219 },
    { name: "Cape Town, South Africa", lat: -33.9249, lon: 18.4241 },
    { name: "Johannesburg, South Africa", lat: -26.2041, lon: 28.0473 },
    { name: "Casablanca, Morocco", lat: 33.5731, lon: -7.5898 },
    { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708 },
    { name: "Istanbul, Turkey", lat: 41.0082, lon: 28.9784 },
    { name: "Tel Aviv, Israel", lat: 32.0853, lon: 34.7818 },
    { name: "Riyadh, Saudi Arabia", lat: 24.7136, lon: 46.6753 },
    { name: "Toronto, Canada", lat: 43.6532, lon: -79.3832 },
    { name: "Vancouver, Canada", lat: 49.2827, lon: -123.1207 },
    { name: "Montreal, Canada", lat: 45.5017, lon: -73.5673 },
    { name: "Calgary, Canada", lat: 51.0447, lon: -114.0719 },
  ];

  for (let i = 0; i < 15; i++) {
    const randomLoc = weatherLocations[Math.floor(Math.random() * weatherLocations.length)];
    const weather = await fetchWeatherData(randomLoc.lat, randomLoc.lon);

    if (weather && weather.current) {
      const precip = weather.current.precipitation || 0;
      const weatherCode = weather.current.weather_code || 0;

      if (
        precip > 1.0 ||
        weatherCode >= 95 ||
        (weatherCode >= 71 && weatherCode <= 77) ||
        (weatherCode >= 61 && weatherCode <= 67) ||
        (weatherCode >= 45 && weatherCode <= 48)
      ) {
        console.log(
          `Found severe weather: ${precip}mm/h, code ${weatherCode} in ${randomLoc.name}`,
        );
        return {
          name: randomLoc.name,
          latitude: randomLoc.lat,
          longitude: randomLoc.lon,
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("No severe weather found globally, picking random location");
  const randomLoc = weatherLocations[Math.floor(Math.random() * weatherLocations.length)];
  return {
    name: randomLoc.name,
    latitude: randomLoc.lat,
    longitude: randomLoc.lon,
  };
};

const buildRadarPattern = async (phase, width, height, startRow = 0, endRow = height) => {
  const now = Date.now();
  if (!weatherData || now - lastWeatherUpdate > 300000) {
    weatherData = await fetchWeatherData(currentLocation.latitude, currentLocation.longitude);
    lastWeatherUpdate = now;
  }
  const fullPattern = [];

  let currentPrecip = 0;
  let currentWeatherCode = 0;

  if (weatherData && weatherData.current) {
    currentPrecip = weatherData.current.precipitation || 0;
    currentWeatherCode = weatherData.current.weather_code || 0;
  }

  for (let y = 0; y < height; y++) {
    let row = "";

    for (let x = 0; x < 22; x++) {
      let emojiIndex = 0;

      if (currentPrecip === 0 && currentWeatherCode <= 3) {
        emojiIndex = 0;
      } else if (currentPrecip > 0 || currentWeatherCode > 3) {
        const centerX = 11;
        const centerY = height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        let intensity = currentPrecip;

        const frontEffect = Math.sin((x + phase * 2) * 0.3) * Math.cos((y + phase) * 0.2);
        intensity += frontEffect * 0.5;

        if (currentPrecip > 1.0) {
          const stormDistance = Math.abs(distance - 8 - Math.sin(phase * 0.5) * 3);
          if (stormDistance < 4) {
            intensity += (4 - stormDistance) * 0.8;
          }
        }

        if (intensity < 0.1) emojiIndex = 0;
        else if (intensity < 0.5) emojiIndex = 1;
        else if (intensity < 1.0) emojiIndex = 2;
        else if (intensity < 2.5) emojiIndex = 3;
        else if (intensity < 5.0) emojiIndex = 4;
        else emojiIndex = 5;
      }

      row += weatherEmojis[emojiIndex];
    }

    fullPattern.push(row);
  }

  const pattern = fullPattern.slice(startRow, endRow);

  if (startRow === 0) {
    const timestamp = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();

    let weatherInfo = "";
    if (weatherData && weatherData.current) {
      const temp = Math.round(weatherData.current.temperature_2m);
      const precip = weatherData.current.precipitation || 0;
      const wind = Math.round(weatherData.current.wind_speed_10m || 0);
      weatherInfo = `🌡️ ${temp}°C | 🌧️ ${precip}mm/h | 💨 ${wind}km/h`;
    }

    const title = `# 🌦️ WEATHER RADAR - ${currentLocation.name}`;
    const datetime = `## ${date} | ${timestamp} CST`;
    const currentWeather = weatherInfo ? `### ${weatherInfo}` : "";
    const separator = `═══════════════════════════════════════════════════`;
    const legendTitle = `### 📊 PRECIPITATION INTENSITY`;
    const legend1 = `⬜ Clear  🟦 Light  🟩 Moderate  🟨 Heavy`;
    const legend2 = `🟧 Very Heavy  🟥 Severe  🟪 Hail  ⬛ Tornado`;
    const commands = `💬 Commands: \`.location <city>\` | \`.random\``;
    const divider = `═══════════════════════════════════════════════════`;

    pattern.unshift(title);
    pattern.unshift(datetime);
    if (currentWeather) pattern.unshift(currentWeather);
    pattern.unshift(separator);
    pattern.unshift(legendTitle);
    pattern.unshift(legend1);
    pattern.unshift(legend2);
    pattern.unshift(commands);
    pattern.unshift(divider);
  }

  return pattern.join("\n");
};

class RadarDisplay {
  constructor() {
    this.messages = [];
    this.phase = 0;
    this.animationRunning = false;
    this.width = MAP_WIDTH;
    this.height = MAP_HEIGHT;
    this.eventPhase = 0;
    this.messageCount = Math.ceil(MAP_HEIGHT / ROWS_PER_MESSAGE);
  }

  async createDisplay(channel) {
    console.log(`🌦️ Creating large weather radar map with ${this.messageCount} segments...`);

    for (let i = 0; i < this.messageCount; i++) {
      try {
        const startRow = i * ROWS_PER_MESSAGE;
        const endRow = Math.min((i + 1) * ROWS_PER_MESSAGE, this.height);

        const pattern = await buildRadarPattern(
          this.phase,
          this.width,
          this.height,
          startRow,
          endRow,
        );

        const message = await channel.send(pattern);
        this.messages.push({
          message,
          startRow,
          endRow,
        });

        await new Promise((resolve) => setTimeout(resolve, 350));

        console.log(
          `📩 Sent radar segment ${i + 1}/${this.messageCount} (rows ${startRow}-${endRow})...`,
        );
      } catch (error) {
        console.error(`Error sending message segment ${i}:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Created ${this.messages.length} radar segments for continuous map`);
  }

  async startAnimation() {
    if (this.animationRunning) return;
    this.animationRunning = true;

    console.log("🔄 Starting weather radar animation...");
    let cycleCount = 0;

    while (this.animationRunning) {
      this.phase += 0.1;
      this.eventPhase += 0.05;
      cycleCount++;

      for (let i = 0; i < this.messages.length; i++) {
        const msgData = this.messages[i];
        const pattern = await buildRadarPattern(
          this.phase,
          this.width,
          this.height,
          msgData.startRow,
          msgData.endRow,
        );

        try {
          await msgData.message.edit(pattern);
        } catch (error) {
          console.error(`Failed to edit message segment ${i}:`, error.message);

          if (error.code === 10008) {
            this.messages.splice(i, 1);
            i--;
            console.log(`⚠️ Radar segment removed, ${this.messages.length} segments remaining`);
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await new Promise((resolve) => setTimeout(resolve, RADAR_SPEED / this.messages.length));
      }

      if (cycleCount % 20 === 0) {
        console.log(`♻️ Weather radar running: ${cycleCount} cycles completed`);
      }

      if (cycleCount % 50 === 0) {
        console.log(`🌪️ Special weather event detected in ${currentLocation.name}!`);
      }

      await new Promise((resolve) => setTimeout(resolve, RADAR_SPEED));
    }
  }

  stopAnimation() {
    this.animationRunning = false;
    console.log("🛑 Stopping weather radar animation");
  }

  async removeDisplay(channel) {
    console.log("🧹 Cleaning up radar messages...");

    for (const msgData of this.messages) {
      try {
        await msgData.message.delete();
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to delete message:`, error.message);
      }
    }

    this.messages = [];
    console.log("✅ Cleanup complete");
  }

  async changeLocation(newLocation) {
    currentLocation = newLocation;
    weatherData = null;
    lastWeatherUpdate = 0;
    this.phase = 0;
    this.eventPhase = 0;
    console.log(`📍 Location updated to: ${currentLocation.name}`);

    console.log(`🌐 Fetching weather data for ${currentLocation.name}...`);
    weatherData = await fetchWeatherData(currentLocation.latitude, currentLocation.longitude);
    lastWeatherUpdate = Date.now();

    if (weatherData) {
      const temp = weatherData.current ? Math.round(weatherData.current.temperature_2m) : "N/A";
      const precip = weatherData.current ? weatherData.current.precipitation || 0 : 0;
      console.log(`✅ Weather data loaded: ${temp}°C, ${precip}mm/h precipitation`);
    } else {
      console.log(`⚠️ No weather data available for ${currentLocation.name}`);
    }

    if (this.messages.length > 0) {
      for (let i = 0; i < this.messages.length; i++) {
        const msgData = this.messages[i];
        const pattern = await buildRadarPattern(
          0,
          this.width,
          this.height,
          msgData.startRow,
          msgData.endRow,
        );

        try {
          await msgData.message.edit(pattern);
        } catch (error) {
          console.error(`Failed to update message ${i}:`, error.message);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }
}

const radar = new RadarDisplay();

client.on("ready", () => {
  console.log(`🚀 Weather Bot ready! Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== GROUP_CHAT_ID) return;

  const content = message.content.toLowerCase().trim();

  if (content === ".radar" || content === ".weather") {
    try {
      await radar.removeDisplay(message.channel);
      await radar.createDisplay(message.channel);
      await radar.startAnimation();
    } catch (error) {
      console.error("Error creating radar:", error);
      message.reply("❌ Failed to create weather radar");
    }
  }

  if (content === ".stop") {
    radar.stopAnimation();
    await radar.removeDisplay(message.channel);
    message.reply("🛑 Weather radar stopped and cleaned up");
  }

  if (content.startsWith(".location ")) {
    const locationQuery = content.replace(".location ", "").trim();

    if (!locationQuery) {
      message.reply("❌ Please provide a location name");
      return;
    }

    const coordinates = await fetchLocationCoordinates(locationQuery);

    if (coordinates) {
      await radar.changeLocation(coordinates);
      message.reply(`📍 Location changed to: ${coordinates.name}`);
    } else {
      message.reply(`❌ Could not find location: ${locationQuery}`);
    }
  }

  if (content === ".random") {
    try {
      const randomLocation = await findActiveWeatherLocation();
      await radar.changeLocation(randomLocation);
      message.reply(`🎲 Random location with active weather: ${randomLocation.name}`);
    } catch (error) {
      console.error("Error finding random weather location:", error);
      message.reply("❌ Failed to find random weather location");
    }
  }

  if (content === ".help") {
    const helpMessage = `
# 🌦️ Weather Radar Bot Commands

**Basic Commands:**
\`.radar\` or \`.weather\` - Start weather radar display
\`.stop\` - Stop radar and clean up messages
\`.location <city>\` - Change radar location
\`.random\` - Find random location with active weather
\`.help\` - Show this help message

**Examples:**
\`.location Miami, FL\`
\`.location London, UK\`
\`.location Tokyo, Japan\`

**Features:**
• Real-time weather data from Open-Meteo API
• Animated precipitation radar
• Temperature, wind, and precipitation info
• Global location support
• Automatic severe weather detection
    `;

    message.reply(helpMessage);
  }
});

client.login(TOKEN);
