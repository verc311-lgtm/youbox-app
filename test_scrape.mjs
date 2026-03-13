import dotenv from "dotenv";

dotenv.config();

async function testExtraction() {
    const targetUrl = "https://www.amazon.com/Logitech-Superlight-Lightweight-Programmable-Compatible/dp/B087LXCTFJ";
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    console.log("Fetching HTML via proxy:", proxyUrl);
    try {
        const urlResponse = await fetch(proxyUrl);

        const status = urlResponse.status;
        console.log("Status:", status);

        const data = await urlResponse.json();
        const html = data.contents;
        console.log("HTML length:", html.length);
        console.log("HTML preview:", html.substring(0, 500));

        // Check if it's a captcha page
        if (html.includes("captcha") || html.includes("robot")) {
            console.log("WARNING: Amazon is still blocking via Proxy.");
        } else {
            console.log("SUCCESS: Proxy bypassed blocks.");
        }

    } catch (e) {
        console.error("Fetch failed", e);
    }
}

testExtraction();
