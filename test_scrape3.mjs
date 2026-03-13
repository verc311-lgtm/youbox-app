import dotenv from "dotenv";

dotenv.config();

async function testExtraction() {
    const url = "https://www.amazon.com/Logitech-Superlight-Lightweight-Programmable-Compatible/dp/B087LXCTFJ";

    console.log("Fetching HTML as Googlebot:", url);
    try {
        const urlResponse = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
                "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            }
        });

        const status = urlResponse.status;
        console.log("Status:", status);

        const html = await urlResponse.text();
        console.log("HTML length:", html.length);
        // Find the price in the HTML
        const priceMatch = html.match(/(?:<span class="a-price-whole">|\$|£|€)(\d+(?:\.\d{2})?)/);
        console.log("Found Price Match?", priceMatch ? priceMatch[0] : "No");

        if (html.includes("captcha") || html.includes("robot")) {
            console.log("WARNING: Amazon still blocked Googlebot.");
        } else {
            console.log("SUCCESS: Googlebot bypassed.");
        }
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

testExtraction();
