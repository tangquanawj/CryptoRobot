const axios = require("axios");
const crypto = require("crypto");
const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
  "JNJ": "强生",
  "BABA": "阿里巴巴",
  "SE": "SEA",
  "ARM": "ARM",
  "JD": "京东",
  "NTES": "网易",
  "MPNGY": "美团",
  "MSTR": "微策略"
};

const coreUsStocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"];
const rotationUsStocks = ["TSLA", "META", "JPM", "V", "JNJ", "BABA", "SE", "ARM", "JD", "NTES", "MPNGY", "MSTR"];
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
  "9618.HK": "京东",
  "0293.HK": "国泰航空",
  "0753.HK": "中国国航",
  "1055.HK": "中国南方航空",
  "0670.HK": "中国东方航空"
};

const coreHkStocks = ["0700.HK", "9988.HK", "3690.HK", "1810.HK", "0941.HK"];
const rotationHkStocks = ["0005.HK", "0001.HK", "0939.HK", "2318.HK", "1024.HK", "9618.HK", "0293.HK", "0753.HK", "1055.HK", "0670.HK"];
const allHkStocks = [...coreHkStocks, ...rotationHkStocks];

const hkStockHoldings = {
  "0700.HK": 100,
  "9988.HK": 50
};

const hkIndexSymbols = {
  "^HSI": "恒生指数",
  "^HSCE": "国企指数",
  "HSTECH.HK": "恒生科技指数"
};

const allHkIndices = ["^HSI", "^HSCE", "HSTECH.HK"];

function sign(timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", stringToSign).update("").digest("base64");
}

async function getStockData(symbols) {
  const results = [];
  
  try {
    console.log(`Fetching stock data for ${symbols.join(', ')}`);
    
    // yahoo-finance2 needs symbols array
    const queryOptions = {
      lang: "en-US",
      region: "US"
    };
    
    const quoteData = await yahooFinance.quote(symbols, queryOptions);
    const quotes = Array.isArray(quoteData) ? quoteData : [quoteData];
    
    console.log("Received", quotes.length, "quotes from Yahoo Finance");
    
    quotes.forEach(q => {
      if (q && q.symbol) {
        const price = q.regularMarketPrice;
        const change = q.regularMarketChangePercent;
        
        if (price != null && change != null) {
          results.push({
            symbol: q.symbol,
            regularMarketPrice: price,
            // the module returns change in percent format (e.g. -1.68 meaning -1.68%)
            // our script expects it in decimal format (e.g. -0.0168) because later we do change * 100
            regularMarketChangePercent: change / 100
          });
        }
      }
    });
    
    console.log("Stock data fetch complete, got", results.length, "valid quotes");
    return results;
  } catch (error) {
    console.error("Error fetching stock data:", error.message);
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

    // 辅助函数：格式化涨跌幅 (超紧凑版)
    const formatChange = (change) => {
      const color = change >= 0 ? "green" : "red";
      const sign = change > 0 ? "+" : ""; // 如果是0就不加符号，如果是正数加+，负数自带-
      return `<font color="${color}">${sign}${(change * 100).toFixed(2)}%</font>`;
    };

    allUsIndices.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = usIndexSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      usIndexLines.push(`${name}: ${lastPrice.toFixed(0)} (${formatChange(change)})`);
    });

    allUsStocks.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = usStockSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      // 省略美元符号，价格保留1位小数，更紧凑
      const line = `${name}: ${lastPrice.toFixed(1)} (${formatChange(change)})`;

      if (coreUsStocks.includes(symbol)) {
        coreUsStockLines.push(line);
        if (Math.abs(change * 100) >= 3) alert += `⚠ ${name} 美股波动超过3%\n`;
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
      hkIndexLines.push(`${name}: ${lastPrice.toFixed(0)} (${formatChange(change)})`);
    });

    allHkStocks.forEach(symbol => {
      const data = stockMap[symbol];
      if (!data) return;
      const name = hkStockSymbols[symbol] || symbol;
      const lastPrice = data.regularMarketPrice;
      const change = data.regularMarketChangePercent;
      // 省略港币符号，价格保留1位小数
      const line = `${name}: ${lastPrice.toFixed(1)} (${formatChange(change)})`;

      if (coreHkStocks.includes(symbol)) {
        coreHkStockLines.push(line);
        if (Math.abs(change * 100) >= 3) alert += `⚠ ${name} 港股波动超过3%\n`;
        if (hkStockHoldings[symbol]) totalHkdValue += hkStockHoldings[symbol] * lastPrice;
      }

      if (rotationHkStocks.includes(symbol)) {
        rotationHkStockData.push({ symbol, name, lastPrice, change, line });
      }
    });

    rotationHkStockData.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const topRotationHkStocks = rotationHkStockData.slice(0, 3);

    const elements = [
      { tag: "div", text: { tag: "lark_md", content: "🇺🇸 **美股行情**\n**指数**: " + usIndexLines.join(" | ") + "\n**核心**: " + coreUsStockLines.join(" | ") + "\n**轮动**: " + topRotationUsStocks.map(s => s.line).join(" | ") } },
      { tag: "hr" },
      
      { tag: "div", text: { tag: "lark_md", content: "🇭🇰 **港股行情**\n**指数**: " + hkIndexLines.join(" | ") + "\n**核心**: " + coreHkStockLines.join(" | ") + "\n**轮动**: " + topRotationHkStocks.map(s => s.line).join(" | ") } },
      { tag: "hr" },
      
      { tag: "div", text: { tag: "lark_md", content: `💰 **总持仓**: 美股 $${totalUsdValue.toFixed(0)} | 港股 HK$${totalHkdValue.toFixed(0)}` } },
      { tag: "div", text: { tag: "lark_md", content: alert || "✅ 今日波动正常" } }
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
