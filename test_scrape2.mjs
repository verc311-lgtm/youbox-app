import dotenv from "dotenv";

dotenv.config();

async function testExtraction() {
    const targetUrl = "https://www.amazon.com/Logitech-Superlight-Lightweight-Programmable-Compatible/dp/B087LXCTFJ";

    // Try Microlink (good for meta tags)
    const proxyUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&palette=true`;

    console.log("Fetching HTML via Microlink:", proxyUrl);
    try {
        const urlResponse = await fetch(proxyUrl);
        const data = await urlResponse.json();
        console.log("Microlink data:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Fetch failed", e);
    }
}

testExtraction();
