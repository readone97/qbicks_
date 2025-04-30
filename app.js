// Required packages
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { createCanvas } = require('canvas');
const { registerFont } = require('canvas');
const asciichart = require('asciichart');

// Configure logging
const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} - ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'bot.log' })
    ]
});

// Add custom log levels
logger.warn = logger.warning = logger.info;

// Configuration
const TELEGRAM_BOT_TOKEN = "7914464413:AAGHqcvHVymQmaGBltHYhTj_q9i6F5gdfdM";
const VYBE_API_KEY = "9nh76uMLnctW4TkuFsvNMUSc7CvMNQ4yPnQfqupz7vNgtUyY";

// API Endpoints
const PRICE_ENDPOINT = 'https://api.vybenetwork.xyz/price/{priceFeedId}/pyth-price';
const TOKEN_DETAILS_ENDPOINT = 'https://api.vybenetwork.xyz/token/{mintAddress}';
const TOKEN_TREND_ENDPOINT = 'https://api.vybenetwork.xyz/token/{mintAddress}/transfer-volume';

// Cache configuration
const TREND_CACHE = {};
const CACHE_DURATION = 300; // 5 minutes in seconds

// Request configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds in milliseconds
const REQUEST_TIMEOUT = 30000; // 30 seconds in milliseconds

// Price feed IDs for Solana-based tokens (base58-encoded Solana public keys)
const PRICE_FEED_IDS = {
    // Major Cryptocurrencies
    "BTC": "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J",  // Bitcoin
    "ETH": "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1VZ",  // Ethereum
    "SOL": "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",  // Solana
    
    // Stablecoins
    "USDC": "Gv9sZbBvQ6UQpJZ7B8ZRqKdWYvQ6UQpJZ7B8ZRqKdWYv",  // USD Coin
    "USDT": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Tether
    "DAI": "8A9xKz3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K",  // DAI
    
    // Solana DeFi Tokens
    "RAY": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Raydium
    "SRM": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Serum
    "ORCA": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Orca
    "STEP": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Step Finance
    "MNGO": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Mango Markets
    "FIDA": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Bonfida
    "COPE": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // COPE
    "MEDIA": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Media Network
    "OXY": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Oxygen
    "SLRS": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Solrise Finance
    
    // Solana NFT & Gaming Tokens
    "ATLAS": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Star Atlas
    "POLIS": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Star Atlas DAO
    "SHDW": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // GenesysGo Shadow
    "PRISM": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Prism Protocol
    "LIQ": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // LIQ Protocol
    
    // Solana Infrastructure Tokens
    "PORT": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Port Finance
    "SLIM": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Solanium
    "GRAPE": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Grape Protocol
    "SAMO": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Samoyedcoin
    "BONK": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Bonk
    
    // Solana Yield & Staking Tokens
    "MARINADE": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Marinade
    "LARIX": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Larix
    "SLND": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML",  // Solend
    "HBB": "3vxLXJqLqF3JG5TCbYycbKWRBbCJQLxQmBGCkyqEEefL",  // Hubble Protocol
    "KIN": "4X1oYoFWYtLebk51zuh889r1WFLe8Z9qWApj87hQMfML"   // Kin
};

// Token mint addresses for Solana-based tokens
const TOKEN_MINT_ADDRESSES = {
    // Major Cryptocurrencies
    "BTC": "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",  // Bitcoin
    "ETH": "2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk",  // Ethereum
    "SOL": "So11111111111111111111111111111111111111112",  // Solana
    
    // Stablecoins
    "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USD Coin
    "USDT": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // Tether
    "DAI": "EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o",  // DAI
    
    // Solana DeFi Tokens
    "RAY": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",  // Raydium
    "SRM": "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",  // Serum
    "ORCA": "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",  // Orca
    "STEP": "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT",  // Step Finance
    "MNGO": "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac",  // Mango Markets
    "FIDA": "EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp",  // Bonfida
    "COPE": "8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh",  // COPE
    "MEDIA": "ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs",  // Media Network
    "OXY": "z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M",  // Oxygen
    "SLRS": "SLRSSpSLUTP7okbCUBYStWCo1vUg6oLvbnkVfjTGbYX",  // Solrise Finance
    
    // Solana NFT & Gaming Tokens
    "ATLAS": "ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx",  // Star Atlas
    "POLIS": "poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk",  // Star Atlas DAO
    "SHDW": "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",  // GenesysGo Shadow
    "PRISM": "PRSMNsEPqhGVCH1TtWiJqPjJyh2cKrLostPZTNy1o5x",  // Prism Protocol
    "LIQ": "4wjPQJ6PrkC4dHhYghwJzGBVP78DkBzA2U3kHoFNBuhj",  // LIQ Protocol
    
    // Solana Infrastructure Tokens
    "PORT": "PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y",  // Port Finance
    "SLIM": "xxxxa1sKNGwFtw2kFn8XauW9xq8hBZ5kVtcSesTT9fW",  // Solanium
    "GRAPE": "8upjSpvjcdpuzhfR1zriwg5XkwDrVjS7S9jZGFZt3Wq",  // Grape Protocol
    "SAMO": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",  // Samoyedcoin
    "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",  // Bonk
    
    // Solana Yield & Staking Tokens
    "MARINADE": "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",  // Marinade
    "LARIX": "Lrxqnh6ZHKbGy3dcrCED43nsoLkM1LTzU2jRfWe8qUC",  // Larix
    "SLND": "SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp",  // Solend
    "HBB": "HBB111SCo9jkCejsZfz8Ec8nH7T6THF8KEKSnvwT6XK",  // Hubble Protocol
    "KIN": "kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6"   // Kin
};

// Initialize bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Helper: Create axios instance with retry logic
function createAxiosInstance() {
    const instance = axios.create({
        timeout: REQUEST_TIMEOUT,
        headers: {
            'Accept': 'application/json',
            'X-API-KEY': VYBE_API_KEY
        }
    });

    instance.interceptors.response.use(null, async (error) => {
        const { config, response } = error;
        if (!config || !config.retry) {
            return Promise.reject(error);
        }

        config.retry -= 1;
        if (config.retry > 0) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return instance(config);
        }

        return Promise.reject(error);
    });

    return instance;
}

// Helper: Get token price
async function getTokenPrice(symbol) {
    try {
        const priceFeedId = PRICE_FEED_IDS[symbol.toUpperCase()];
        if (!priceFeedId) {
            logger.error(`No price feed ID found for symbol: ${symbol}`);
            return null;
        }

        const url = PRICE_ENDPOINT.replace('{priceFeedId}', priceFeedId);
        logger.info(`Fetching Pyth price for ${symbol} using feed ID: ${priceFeedId}`);
        logger.info(`Request URL: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': VYBE_API_KEY
            }
        });

        if (response.status !== 200) {
            logger.error(`API error: ${response.status} - ${response.data}`);
            return null;
        }

        const data = response.data;
        logger.info(`Received price data: ${JSON.stringify(data)}`);

        return {
            price: parseFloat(data.price || 0),
            price_change_24h: parseFloat(data.price_change_24h || 0),
            volume_24h: parseFloat(data.volume_24h || 0),
            market_cap: parseFloat(data.market_cap || 0),
            confidence: parseFloat(data.confidence || 0),
            timestamp: data.timestamp || new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error fetching token price: ${error.message}`);
        return null;
    }
}

// Helper: Get token details
async function getTokenDetails(symbol) {
    try {
        const mintAddress = TOKEN_MINT_ADDRESSES[symbol.toUpperCase()];
        if (!mintAddress) {
            logger.error(`No mint address found for symbol: ${symbol}`);
            return null;
        }

        const url = TOKEN_DETAILS_ENDPOINT.replace('{mintAddress}', mintAddress);
        logger.info(`Fetching token details for ${symbol} using mint address: ${mintAddress}`);

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': VYBE_API_KEY
            }
        });

        if (response.status !== 200) {
            logger.error(`API error: ${response.status} - ${response.data}`);
            return null;
        }

        const data = response.data;
        logger.info(`Received token details: ${JSON.stringify(data)}`);

        return {
            name: data.name || '',
            symbol: data.symbol || '',
            mint_address: data.mintAddress || '',
            decimals: data.decimal || 0,
            current_supply: parseFloat(data.currentSupply || 0),
            market_cap: parseFloat(data.marketCap || 0),
            token_volume_24h: parseFloat(data.tokenAmountVolume24h || 0),
            usd_volume_24h: parseFloat(data.usdValueVolume24h || 0),
            price: parseFloat(data.price || 0),
            price_1d: parseFloat(data.price1d || 0),
            price_7d: parseFloat(data.price7d || 0),
            price_change_1d: data.price1d ? ((data.price - data.price1d) / data.price1d) * 100 : 0,
            price_change_7d: data.price7d ? ((data.price - data.price7d) / data.price7d) * 100 : 0,
            category: data.category || '',
            subcategory: data.subcategory || '',
            verified: data.verified || false,
            logo_url: data.logoUrl || '',
            update_time: data.updateTime || 0
        };
    } catch (error) {
        logger.error(`Error fetching token details: ${error.message}`);
        return null;
    }
}

// Helper: Get token trend
async function getTokenTrend(symbol) {
    try {
        const cacheKey = `${symbol}_${Math.floor(Date.now() / (CACHE_DURATION * 1000))}`;
        if (TREND_CACHE[cacheKey]) {
            logger.info(`Using cached trend data for ${symbol}`);
            return TREND_CACHE[cacheKey];
        }

        const mintAddress = TOKEN_MINT_ADDRESSES[symbol.toUpperCase()];
        if (!mintAddress) {
            logger.error(`No mint address found for symbol: ${symbol}`);
            return null;
        }

        const url = TOKEN_TREND_ENDPOINT.replace('{mintAddress}', mintAddress);
        logger.info(`Fetching token trend for ${symbol} using mint address: ${mintAddress}`);

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-KEY': VYBE_API_KEY
            }
        });

        if (response.status !== 200) {
            logger.error(`API error: ${response.status} - ${response.data}`);
            return null;
        }

        const data = response.data;
        logger.info(`Received token trend data for ${symbol}`);

        const timeSeries = data.data || [];
        if (!timeSeries.length) return null;

        timeSeries.sort((a, b) => a.timeBucketStart - b.timeBucketStart);
        const last7Days = timeSeries.slice(-7);

        const volumes = last7Days.map(item => {
            const volume = parseFloat(item.volume || 0);
            return isNaN(volume) ? 0 : volume;
        });

        const amounts = last7Days.map(item => {
            const amount = parseFloat(item.amount || 0);
            return isNaN(amount) ? 0 : amount;
        });

        const volumeChange24h = volumes.length > 1 ? 
            ((volumes[volumes.length - 1] - volumes[volumes.length - 2]) / volumes[volumes.length - 2] * 100) : 0;
        
        const volumeChange7d = volumes.length > 1 ? 
            ((volumes[volumes.length - 1] - volumes[0]) / volumes[0] * 100) : 0;

        const avgVolume24h = volumes.slice(-1).reduce((a, b) => a + b, 0) / volumes.slice(-1).length || 0;
        const avgVolume7d = volumes.reduce((a, b) => a + b, 0) / volumes.length || 0;

        const transferCount24h = amounts.slice(-1).length;
        const transferCount7d = amounts.length;

        const avgTransferSize = volumes.reduce((a, b) => a + b, 0) / volumes.length || 0;
        const largestTransfer = Math.max(...volumes) || 0;

        const dailyChanges = volumes.slice(1).map((v, i) => ((v - volumes[i]) / volumes[i]) * 100);
        const volatility = dailyChanges.length ? 
            Math.sqrt(dailyChanges.reduce((a, b) => a + Math.pow(b - (dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length), 2), 0) / dailyChanges.length) : 0;

        const insights = generateInvestmentInsights(
            volumeChange24h,
            volumeChange7d,
            volatility,
            avgTransferSize,
            largestTransfer,
            transferCount24h
        );

        const result = {
            time_series: last7Days,
            daily_volume: volumes[volumes.length - 1] || 0,
            weekly_volume: volumes.reduce((a, b) => a + b, 0) || 0,
            volume_change_24h: volumeChange24h,
            volume_change_7d: volumeChange7d,
            transfer_count_24h: transferCount24h,
            transfer_count_7d: transferCount7d,
            average_transfer_size: avgTransferSize,
            largest_transfer: largestTransfer,
            avg_volume_24h: avgVolume24h,
            avg_volume_7d: avgVolume7d,
            volatility: volatility,
            insights: insights
        };

        TREND_CACHE[cacheKey] = result;
        return result;
    } catch (error) {
        logger.error(`Error fetching token trend: ${error.message}`);
        return null;
    }
}

// Helper: Generate investment insights
function generateInvestmentInsights(volumeChange24h, volumeChange7d, volatility, avgTransferSize, largestTransfer, transferCount24h) {
    const insights = [];
    let riskLevel = "Medium";
    let recommendation = "Hold";
    let confidence = "Moderate";

    // Volume Analysis
    if (volumeChange24h > 20 && volumeChange7d > 50) {
        insights.push("📈 Strong upward momentum with significant volume increase");
        riskLevel = "Low";
        recommendation = "Consider Buying";
        confidence = "High";
    } else if (volumeChange24h < -20 && volumeChange7d < -30) {
        insights.push("📉 Significant volume decline indicating potential bearish trend");
        riskLevel = "High";
        recommendation = "Consider Selling";
        confidence = "High";
    } else if (volumeChange24h > 10) {
        insights.push("📊 Positive volume trend in the last 24 hours");
        riskLevel = "Medium-Low";
    } else if (volumeChange24h < -10) {
        insights.push("📊 Negative volume trend in the last 24 hours");
        riskLevel = "Medium-High";
    }

    // Volatility Analysis
    if (volatility > 15) {
        insights.push("⚡ High volatility detected - significant price swings");
        riskLevel = "High";
        confidence = "Low";
    } else if (volatility < 5) {
        insights.push("📊 Low volatility - stable price movement");
        riskLevel = "Low";
        confidence = "High";
    }

    // Transfer Pattern Analysis
    if (avgTransferSize > largestTransfer * 0.2) {
        insights.push("💰 Dominated by large transfers - institutional activity");
        if (volumeChange24h > 0) {
            riskLevel = "Low";
            confidence = "High";
        }
    } else {
        insights.push("👥 Many small transfers - retail participation");
        if (volumeChange24h < 0) {
            riskLevel = "High";
            confidence = "Low";
        }
    }

    // Activity Level Analysis
    if (transferCount24h > 1000) {
        insights.push("🚀 High transfer activity - strong market interest");
        if (volumeChange24h > 0) {
            riskLevel = "Low";
            confidence = "High";
        }
    } else if (transferCount24h < 100) {
        insights.push("📊 Low transfer activity - limited market interest");
        if (volumeChange24h < 0) {
            riskLevel = "High";
            confidence = "Low";
        }
    }

    return {
        risk_level: riskLevel,
        recommendation: recommendation,
        confidence: confidence,
        insights: insights
    };
}

// Helper: Create text chart
function createTextChart(data, maxValue, width = 50) {
    if (!data || data.length === 0) return "No data available";
    
    return data.map((value, index) => {
        const barLength = Math.round((value / maxValue) * width);
        const date = new Date();
        date.setDate(date.getDate() - (data.length - 1 - index));
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${dateStr}: ${'█'.repeat(barLength)} $${value.toLocaleString()}`;
    }).join('\n');
}

async function createVolumeChart(volumeData, transferData) {
    if (!volumeData || !transferData || volumeData.length === 0 || transferData.length === 0) {
        return "No trend data available";
    }

    const maxVolume = Math.max(...volumeData);
    const maxTransfers = Math.max(...transferData);
    
    const volumeChart = createTextChart(volumeData, maxVolume);
    const transferChart = createTextChart(transferData, maxTransfers);
    
    return `*Volume (USD)*\n\`\`\`\n${volumeChart}\n\`\`\`\n\n` +
           `*Number of Transfers*\n\`\`\`\n${transferChart}\n\`\`\``;
}

// Command: Start
bot.onText(/\/start/, async (msg) => {
    const user = msg.from;
    const welcomeMessage = `👋 Wagwan geng Welcome to Qbicks Price Bot, ${user.first_name}!\n\n` +
        "I provide real-time cryptocurrency prices and token information from Pyth Price feeds.\n\n" +
        "Use /help to see available commands.";

    const keyboard = {
        inline_keyboard: [
            [
                { text: "🔍 Token Info", callback_data: "token_info" },
                { text: "💰 Price Info", callback_data: "price_info" }
            ],
            [
                { text: "📊 Price Alert", callback_data: "set_alert" },
                { text: "❓ Help", callback_data: "help" }
            ]
        ]
    };

    await bot.sendMessage(msg.chat.id, welcomeMessage, { reply_markup: keyboard });
});

// Command: Help
bot.onText(/\/help/, async (msg) => {
    const helpText = "🤖 *Qbicks Price Bot Commands*\n\n" +
        "*Token Commands:*\n" +
        "/token [symbol] - Get detailed token information\n" +
        "Example: `/token BTC`\n\n" +
        "*Price Commands:*\n" +
        "/price [symbol] - Get current price\n" +
        "Example: `/price BTC`\n\n" +
        "Available tokens:\n" +
        "*Major Cryptocurrencies:*\n" +
        "- BTC (Bitcoin)\n" +
        "- ETH (Ethereum)\n" +
        "- SOL (Solana)\n\n" +
        "*Stablecoins:*\n" +
        "- USDC (USD Coin)\n" +
        "- USDT (Tether)\n" +
        "- DAI\n\n" +
        "*Solana DeFi Tokens:*\n" +
        "- RAY (Raydium)\n" +
        "- SRM (Serum)\n" +
        "- ORCA (Orca)\n" +
        "- STEP (Step Finance)\n" +
        "- MNGO (Mango Markets)\n" +
        "- FIDA (Bonfida)\n" +
        "- COPE\n" +
        "- MEDIA (Media Network)\n" +
        "- OXY (Oxygen)\n" +
        "- SLRS (Solrise Finance)\n\n" +
        "*Solana NFT & Gaming:*\n" +
        "- ATLAS (Star Atlas)\n" +
        "- POLIS (Star Atlas DAO)\n" +
        "- SHDW (GenesysGo Shadow)\n" +
        "- PRISM (Prism Protocol)\n" +
        "- LIQ (LIQ Protocol)\n\n" +
        "*Solana Infrastructure:*\n" +
        "- PORT (Port Finance)\n" +
        "- SLIM (Solanium)\n" +
        "- GRAPE (Grape Protocol)\n" +
        "- SAMO (Samoyedcoin)\n" +
        "- BONK\n\n" +
        "*Solana Yield & Staking:*\n" +
        "- MARINADE\n" +
        "- LARIX\n" +
        "- SLND (Solend)\n" +
        "- HBB (Hubble Protocol)\n" +
        "- KIN\n\n" +
        "*Alert Commands:*\n" +
        "/alert [symbol] [above/below] [price] - Set price alert\n" +
        "Example: `/alert BTC above 50000`\n" +
        "/alerts - View your active alerts\n" +
        "/deletealert [alert_id] - Delete a specific alert\n\n" +
        "*Other Commands:*\n" +
        "/start - Start the bot\n" +
        "/help - Show this help message";

    await bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
});

// Command: Price
bot.onText(/\/price (.+)/, async (msg, match) => {
    const symbol = match[1].toUpperCase();
    
    if (!PRICE_FEED_IDS[symbol]) {
        await bot.sendMessage(msg.chat.id, 
            `Sorry, ${symbol} is not currently supported.\n` +
            "Available tokens: BTC, ETH, SOL, USDC, USDT"
        );
        return;
    }

    await bot.sendMessage(msg.chat.id, `Fetching price for ${symbol}...`);

    const priceInfo = await getTokenPrice(symbol);
    if (!priceInfo) {
        await bot.sendMessage(msg.chat.id,
            "Sorry, I couldn't get the price information. " +
            "Please try again later."
        );
        return;
    }

    const message = `*${symbol} Price Information*\n\n` +
        `💰 *Current Price:* $${priceInfo.price.toFixed(8)}\n` +
        `📈 *24h Change:* ${priceInfo.price_change_24h.toFixed(2)}%\n` +
        `💼 *Market Cap:* $${priceInfo.market_cap.toLocaleString()}\n` +
        `💧 *24h Volume:* $${priceInfo.volume_24h.toLocaleString()}\n` +
        `🎯 *Confidence:* ${priceInfo.confidence.toFixed(2)}\n\n` +
        `_Updated: ${new Date(priceInfo.timestamp).toLocaleString()}_`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "📈 Set Alert", callback_data: `alert_${symbol}` },
                { text: "🔄 Refresh", callback_data: `refresh_${symbol}` }
            ]
        ]
    };

    await bot.sendMessage(msg.chat.id, message, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
});

// Command: Token Details
bot.onText(/\/token (.+)/, async (msg, match) => {
    const symbol = match[1].toUpperCase();
    
    if (!TOKEN_MINT_ADDRESSES[symbol]) {
        await bot.sendMessage(msg.chat.id,
            `Sorry, ${symbol} is not currently supported.\n` +
            "Use /help to see all supported tokens"
        );
        return;
    }

    await bot.sendMessage(msg.chat.id, `Fetching details for ${symbol}...`);

    const tokenInfo = await getTokenDetails(symbol);
    if (!tokenInfo) {
        await bot.sendMessage(msg.chat.id,
            "Sorry, I couldn't get the token information. " +
            "Please try again later."
        );
        return;
    }

    const message = `*${tokenInfo.name} (${tokenInfo.symbol}) Token Information*\n\n` +
        `💰 *Current Price:* $${tokenInfo.price.toFixed(8)}\n` +
        `📈 *24h Change:* ${tokenInfo.price_change_1d.toFixed(2)}%\n` +
        `📊 *7d Change:* ${tokenInfo.price_change_7d.toFixed(2)}%\n` +
        `💼 *Market Cap:* $${tokenInfo.market_cap.toLocaleString()}\n` +
        `💧 *24h Volume (USD):* $${tokenInfo.usd_volume_24h.toLocaleString()}\n` +
        `🔄 *24h Volume (Tokens):* ${tokenInfo.token_volume_24h.toLocaleString()}\n` +
        `🔢 *Decimals:* ${tokenInfo.decimals}\n` +
        `📊 *Current Supply:* ${tokenInfo.current_supply.toLocaleString()}\n` +
        `🏷️ *Category:* ${tokenInfo.category}\n` +
        `🔍 *Subcategory:* ${tokenInfo.subcategory}\n` +
        `✅ *Verified:* ${tokenInfo.verified ? 'Yes' : 'No'}\n\n` +
        `*Mint Address:*\n\`${tokenInfo.mint_address}\`\n\n` +
        `*Price History:*\n` +
        `• 24h: $${tokenInfo.price_1d.toFixed(8)}\n` +
        `• 7d: $${tokenInfo.price_7d.toFixed(8)}\n\n` +
        `_Last updated: ${new Date(tokenInfo.update_time * 1000).toLocaleString()}_`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "📈 Price", callback_data: `price_${symbol}` },
                { text: "📊 Trend", callback_data: `trend_${symbol}` }
            ],
            [
                { text: "🔄 Refresh", callback_data: `refresh_token_${symbol}` }
            ]
        ]
    };

    await bot.sendMessage(msg.chat.id, message, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });

    if (tokenInfo.logo_url) {
        try {
            await bot.sendPhoto(msg.chat.id, tokenInfo.logo_url, {
                caption: `*${tokenInfo.name} Logo*`,
                parse_mode: "Markdown"
            });
        } catch (error) {
            logger.error(`Error sending logo: ${error.message}`);
        }
    }
});

// Command: Token Trend
bot.onText(/\/trend (.+)/, async (msg, match) => {
    try {
        const symbol = match[1].toUpperCase();
        
        if (!TOKEN_MINT_ADDRESSES[symbol]) {
            await bot.sendMessage(msg.chat.id,
                `Sorry, ${symbol} is not currently supported.\n` +
                "Use /help to see all supported tokens"
            );
            return;
        }

        await bot.sendMessage(msg.chat.id, `Analyzing transfer trends for ${symbol}...`);

        const trendInfo = await getTokenTrend(symbol);
        if (!trendInfo || !trendInfo.time_series || trendInfo.time_series.length === 0) {
            await bot.sendMessage(msg.chat.id,
                "Sorry, no trend data is available for this token at the moment. " +
                "Please try again later."
            );
            return;
        }

        // Format the chart data
        let chartText = `*${symbol} Transfer Volume Analysis*\n\n`;
        
        // Volume Chart
        chartText += `*Volume (USD)*\n\`\`\`\n`;
        const volumeData = trendInfo.time_series.map(item => parseFloat(item.volume || 0));
        const maxVolume = Math.max(...volumeData);
        
        volumeData.forEach((volume, index) => {
            const date = new Date(trendInfo.time_series[index].timeBucketStart * 1000);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const barLength = Math.round((volume / maxVolume) * 30);
            chartText += `${dateStr}: ${'█'.repeat(barLength)} $${volume.toLocaleString()}\n`;
        });
        chartText += `\`\`\`\n\n`;
        
        // Transfer Count Chart
        chartText += `*Number of Transfers*\n\`\`\`\n`;
        const transferData = trendInfo.time_series.map(item => parseFloat(item.amount || 0));
        const maxTransfers = Math.max(...transferData);
        
        transferData.forEach((transfers, index) => {
            const date = new Date(trendInfo.time_series[index].timeBucketStart * 1000);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const barLength = Math.round((transfers / maxTransfers) * 30);
            chartText += `${dateStr}: ${'█'.repeat(barLength)} ${transfers.toLocaleString()}\n`;
        });
        chartText += `\`\`\``;

        // Format the trading insights
        const insights = trendInfo.insights || {
            risk_level: "Unknown",
            recommendation: "No recommendation available",
            confidence: "Low",
            insights: ["Insufficient data for analysis"]
        };

        const insightText = `*Trading Insights for ${symbol}*\n\n` +
            `🎯 *Risk Level:* ${insights.risk_level}\n` +
            `💡 *Recommendation:* ${insights.recommendation}\n` +
            `📊 *Confidence:* ${insights.confidence}\n\n` +
            `*Key Observations:*\n` +
            insights.insights.map(insight => `• ${insight}`).join('\n');

        // Format the trend statistics
        const statsText = `*${symbol} Trend Statistics*\n\n` +
            `📊 *Volume Analysis*\n` +
            `• Current 24h Volume: $${(trendInfo.daily_volume || 0).toLocaleString()}\n` +
            `• 7d Volume: $${(trendInfo.weekly_volume || 0).toLocaleString()}\n` +
            `• 24h Change: ${(trendInfo.volume_change_24h || 0).toFixed(2)}%\n` +
            `• 7d Change: ${(trendInfo.volume_change_7d || 0).toFixed(2)}%\n\n` +
            `📈 *Market Activity*\n` +
            `• 24h Transfers: ${(trendInfo.transfer_count_24h || 0).toLocaleString()}\n` +
            `• 7d Transfers: ${(trendInfo.transfer_count_7d || 0).toLocaleString()}\n` +
            `• Avg Transfer Size: $${(trendInfo.average_transfer_size || 0).toLocaleString()}\n` +
            `• Largest Transfer: $${(trendInfo.largest_transfer || 0).toLocaleString()}\n` +
            `• Volatility: ${(trendInfo.volatility || 0).toFixed(2)}%\n\n` +
            `_Last updated: ${new Date().toLocaleString()}_`;

        // Send the charts first
        await bot.sendMessage(msg.chat.id, chartText, {
            parse_mode: "Markdown"
        });

        // Then send the statistics
        await bot.sendMessage(msg.chat.id, statsText, {
            parse_mode: "Markdown"
        });

        // Finally send the insights
        await bot.sendMessage(msg.chat.id, insightText, {
            parse_mode: "Markdown"
        });
    } catch (error) {
        logger.error(`Error in trend command: ${error.message}`);
        await bot.sendMessage(msg.chat.id,
            "Sorry, there was an error processing your request. " +
            "Please try again later."
        );
    }
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;

    if (data === "token_info") {
        await bot.sendMessage(msg.chat.id,
            "Please enter a token symbol to get detailed token information.\n" +
            "Example: /token BTC\n\n" +
            "Available tokens: Use /help to see all supported tokens"
        );
    } else if (data === "price_info") {
        await bot.sendMessage(msg.chat.id,
            "Please enter a token symbol to get price information.\n" +
            "Example: /price BTC"
        );
    } else if (data === "set_alert") {
        await bot.sendMessage(msg.chat.id,
            "Please use the following format to set a price alert:\n" +
            "/alert [symbol] [above/below] [price]\n" +
            "Example: /alert BTC above 50000"
        );
    } else if (data === "help") {
        await bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
    } else if (data.startsWith("alert_")) {
        const symbol = data.split("_")[1];
        await bot.sendMessage(msg.chat.id,
            `Please use the following format to set a price alert for ${symbol}:\n` +
            `/alert ${symbol} [above/below] [price]\n` +
            `Example: /alert ${symbol} above 50000`
        );
    } else if (data.startsWith("refresh_")) {
        const symbol = data.split("_")[1];
        await bot.sendMessage(msg.chat.id, `Fetching price for ${symbol}...`);
        const priceInfo = await getTokenPrice(symbol);
        // ... handle price refresh
    } else if (data.startsWith("refresh_token_")) {
        const symbol = data.split("_")[2];
        await bot.sendMessage(msg.chat.id, `Fetching details for ${symbol}...`);
        const tokenInfo = await getTokenDetails(symbol);
        // ... handle token refresh
    } else if (data.startsWith("trend_")) {
        const symbol = data.split("_")[1];
        await bot.sendMessage(msg.chat.id, `Analyzing transfer trends for ${symbol}...`);
        const trendInfo = await getTokenTrend(symbol);
        // ... handle trend refresh
    }
});

// Handle text messages
bot.on('message', async (msg) => {
    if (msg.text.startsWith('/')) return; // Skip commands

    const text = msg.text.toLowerCase();
    
    if (text.includes('price')) {
        await bot.sendMessage(msg.chat.id,
            "To check token price, use:\n" +
            "/price [symbol]\n" +
            "Example: /price BTC"
        );
    } else if (text.includes('alert')) {
        await bot.sendMessage(msg.chat.id,
            "To set a price alert, use:\n" +
            "/alert [symbol] [above/below] [price]\n" +
            "Example: /alert BTC above 50000"
        );
    } else {
        await bot.sendMessage(msg.chat.id,
            "I can help you with token prices! Try using commands like /price or /help to see all commands."
        );
    }
});

// Start the bot
console.log("Starting bot...");
bot.startPolling();
