const axios = require("axios");
const crypto = require("crypto");

const webhook = process.env.FEISHU_WEBHOOK;
const secret = process.env.FEISHU_SECRET;

const usStockSymbols = {
  "AAPL": "苹果",
  "MSFT": "微软",
  "GOOGL": "谷歌",
  "AMZN": "亚马逊",
  "NVDA": "英伟达",
  "TSLA": "特斯拉",
  "META": "Meta",
  "JPM": "摩根大通",
  "V": "Visa",
  "JNJ": "强生"
};

const coreUsStocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"];
const rotationUsStocks = ["TSLA", "META", "JPM", "V", "JNJ"];
const allUsStocks = [...coreUsStocks, ...rotationUsStocks];

const usStockHoldings = {
  "AAPL": 10,
  "MSFT": 5,
  "NVDA": 2
};

const usIndexSymbols = {
  "^GSPC": "标普500",
  "^DJI": "道琼斯",
  "^IXIC": "纳斯达克",
  "^RUT": "罗素2000"
};

const allUsIndices = ["^GSPC", "^DJI", "^IXIC", "^RUT"];

const hkStockSymbols = {
  "0700.HK": "腾讯控股",
  "9988.HK": "阿里巴巴",
  "3690.HK": "美团",
  "1810.HK": "小米集团",
  "0941.HK": "中国移动",
  "0005.HK": "汇丰控股",
  "0001.HK": "长和",
  "0939.HK": "建设银行",
  "2318.HK": "中国平安",
  "1024.HK": "快手",
  "9618.HK": "京东"
};

const coreHkStocks = ["0700.HK", "9988.HK", "3690.HK", "1810.HK", "0941.HK"];
const rotationHkStocks = ["0005.HK", "0001.HK", "0939.HK", "2318.HK", "1024.HK", "9618.HK"];
const allHkStocks = [...coreHkStocks, ...rotationHkStocks];

const hkStockHoldings = {
  "0700.HK": 100,
  "9988.HK": 50
};

const hkIndexSymbols = {
  "^HSI": "恒生指数",
  "^HSCE": "国企指数",
  "^HSTECH": "恒生科技指数"
};

const allHkIndices = ["^HSI", "^HSCE", "^HSTECH"];

function sign(timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", stringToSign).update("").digest("base64");
}

async function getStockData(symbols) {
  const results = [];
  
  try {
    console.log(`Fetching stock data for ${symbols.join(', ')}`);
    
    const res = await axios.get("https://query1.finance.yahoo.com/v7/finance/quote", {
      params: {
        symbols: symbols.join(','),
        formatted: false
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      timeout: 30000
    });
    
    if (res.data && res.data.quoteResponse && res.data.quoteResponse.result) {
      const quotes = res.data.quoteResponse.result;
      console.log("Received", quotes.length, "quotes from Yahoo Finance");
      
      quotes.forEach(q => {
        if (q && q.symbol) {
          const price = q.regularMarketPrice;
          const change = q.regularMarketChangePercent;
          
          if (price != null && change != null) {
            results.push({
              symbol: q.symbol,
              regularMarketPrice: price,
              regularMarketChangePercent: change
            });
          }
        }
      });
    }
    
    console.log("Stock data fetch complete, got", results.length, "valid quotes");
    return results;
  } catch (error) {
    console.error("Error fetching stock data:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return [];
  }
}



(async () => {
  try {
    let totalUsdValue = 0, totalHkdValue = 0, alert = "";
    let coreUsStockLines = [], rotationUsStockData = [], usIndexLines = [];
    let coreHkStockLines = [], rotationHkStockData = [], hkIndexLines = [];

    const allSymbols = [...allUsStocks, ...allUsIndices, ...allHkStocks, ...allHkIndices];
    const stockData = await getStockData(allSymbols);
    
    const stockMap = {};
    stockData.forEach(item => {
      stockMap[item.symbol] = item;
    });

    allUsIndices.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = usIndexSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      const arrow = change >= 0 ? "↑" : "↓";
      const color = change >= 0 ? "green" : "red";
      usIndexLines.push(`${name} ${lastPrice.toFixed(2)} <font color="${color}">${arrow} ${(change * 100).toFixed(2)}%</font>`);
    });

    allUsStocks.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = usStockSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      const arrow = change >= 0 ? "↑" : "↓";
      const color = change >= 0 ? "green" : "red";
      const line = `${symbol} (${name}) $${lastPrice.toFixed(2)} <font color="${color}">${arrow} ${(change * 100).toFixed(2)}%</font>`;

      if (coreUsStocks.includes(symbol)) {
        coreUsStockLines.push(line);
        if (Math.abs(change * 100) >= 3) alert += `⚠ ${symbol} 美股波动超过3%\n`;
        if (usStockHoldings[symbol]) totalUsdValue += usStockHoldings[symbol] * lastPrice;
      }

      if (rotationUsStocks.includes(symbol)) {
        rotationUsStockData.push({ symbol, name, lastPrice, change, line });
      }
    });

    rotationUsStockData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const topRotationUsStocks = rotationUsStockData.slice(0, 3);

    allHkIndices.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = hkIndexSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      const arrow = change >= 0 ? "↑" : "↓";
      const color = change >= 0 ? "green" : "red";
      hkIndexLines.push(`${name} ${lastPrice.toFixed(2)} <font color="${color}">${arrow} ${(change * 100).toFixed(2)}%</font>`);
    });

    allHkStocks.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = hkStockSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      const arrow = change >= 0 ? "↑" : "↓";
      const color = change >= 0 ? "green" : "red";
      const line = `${symbol} (${name}) HK$${lastPrice.toFixed(2)} <font color="${color}">${arrow} ${(change * 100).toFixed(2)}%</font>`;

      if (coreHkStocks.includes(symbol)) {
        coreHkStockLines.push(line);
        if (Math.abs(change * 100) >= 3) alert += `⚠ ${symbol} 港股波动超过3%\n`;
        if (hkStockHoldings[symbol]) totalHkdValue += hkStockHoldings[symbol] * lastPrice;
      }

      if (rotationHkStocks.includes(symbol)) {
        rotationHkStockData.push({ symbol, name, lastPrice, change, line });
      }
    });

    rotationHkStockData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const topRotationHkStocks = rotationHkStockData.slice(0, 3);

    const elements = [
      { tag: "div", text: { tag: "lark_md", content: "🇺🇸 **美股主要指数**\n" + usIndexLines.join("\n") } },
      { tag: "hr" },
      { tag: "div", text: { tag: "lark_md", content: "🔵 **美股核心池**\n" + coreUsStockLines.join("\n") } },
      { tag: "hr" },
      { tag: "div", text: { tag: "lark_md", content: "� **美股轮动Top3**\n" + topRotationUsStocks.map(s => s.line).join("\n") } },
      { tag: "hr" },
      { tag: "div", text: { tag: "lark_md", content: "🇭🇰 **港股主要指数**\n" + hkIndexLines.join("\n") } },
      { tag: "hr" },
      { tag: "div", text: { tag: "lark_md", content: "🔵 **港股核心池**\n" + coreHkStockLines.join("\n") } },
      { tag: "hr" },
      { tag: "div", text: { tag: "lark_md", content: "🟣 **港股轮动Top3**\n" + topRotationHkStocks.map(s => s.line).join("\n") } },
      { tag: "hr" },
      { tag: "div", text: { tag: "lark_md", content: `💰 美股持仓: $${totalUsdValue.toFixed(2)}` } },
      { tag: "div", text: { tag: "lark_md", content: `💰 港股持仓: HK$${totalHkdValue.toFixed(2)}` } },
      { tag: "div", text: { tag: "lark_md", content: alert || "✅ 波动正常" } }
    ];

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign(timestamp);
    const body = {
      timestamp,
      sign: signature,
      msg_type: "interactive",
      card: {
        config: { wide_screen_mode: true },
        header: { title: { tag: "plain_text", content: "📊 Stock Monitor Pro" }, template: "purple" },
        elements
      }
    };

    if (webhook) {
      const bodyString = JSON.stringify(body);
      console.log(`Body length: ${bodyString.length}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const response = await axios.post(webhook, bodyString, { headers: { "Content-Type": "application/json; charset=utf-8" } });
        console.log("Feishu response:", response.data);
      } catch (error) {
        console.error("Error sending Feishu message:", error.message);
        if (error.response) {
          console.error("Feishu error response:", error.response.data);
        }
      }
    } else {
      console.log("Webhook not set, skipping Feishu message sending");
      console.log("US Indices:", usIndexLines);
      console.log("US Core stocks:", coreUsStockLines);
      console.log("US Top rotation stocks:", topRotationUsStocks.map(s => s.line));
      console.log("HK Indices:", hkIndexLines);
      console.log("HK Core stocks:", coreHkStockLines);
      console.log("HK Top rotation stocks:", topRotationHkStocks.map(s => s.line));
      console.log("Total USD value:", totalUsdValue.toFixed(2));
      console.log("Total HKD value:", totalHkdValue.toFixed(2));
      console.log("Alert:", alert || "No alerts");
    }

  } catch (err) {
    if (err.response) console.error("Feishu error:", err.response.data);
    else console.error("Request error:", err.message);
  }
})();
