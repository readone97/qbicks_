# qbicks_
bot that provides real-time analytics and insights for Solana-based tokens. It fetches token prices, details, and transfer volume trends from the Vybe Network API and presents this information in response to user commands on Telegram. The bot also generates investment insights based on transfer volume trends and volatility.



Setup Instructions
Prerequisites:

Node.js (v14 or later recommended)

npm (Node Package Manager)

Installation Steps:

1.Clone the Repository

git clone <your-repo-url>
cd <project-directory>

2.Install Dependencies

npm install node-telegram-bot-api axios canvas asciichart winston

3.Configuration

The bot token and Vybe API key are currently hardcoded in app.js:

TELEGRAM_BOT_TOKEN

VYBE_API_KEY

For security, consider using environment variables or a .env file in production.

4.Run the Bot

node app.js

5.Interact with the Bot

Use supported commands (e.g., /price BTC, /details SOL, /trend RAY).

Usage Examples
/price BTC - Get the latest price and stats for Bitcoin (Solana-wrapped).

/details SOL - Fetch metadata and supply information for Solana.

/trend USDC - View 7-day transfer volume trend and investment insights for USDC.

5.Security Notes
API Keys: The Vybe API key and Telegram bot token are sensitive. Do not commit them to public repositories.

Rate Limits: The bot implements caching and retry logic, but excessive requests may still be rate-limited by the Vybe API.

link to the telegram bot
https://t.me/Qbicks_bot


