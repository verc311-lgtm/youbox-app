import dotenv from "dotenv";

dotenv.config();

async function testExtraction() {
    const url = "https://www.adidas.com/us/samba-og-shoes/B75806.html";

    console.log("Fetching HTML for:", url);
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

        if (urlResponse.ok) {
            const html = await urlResponse.text();
            console.log("HTML length:", html.length);
            console.log("HTML preview:", html.substring(0, 1000));

            // Look for the price "$100" or similar
            const priceMatch = html.match(/\$\d+/);
            console.log("Rough Price Match:", priceMatch ? priceMatch[0] : "None");

            // Look for image
            const imgMatch = html.match(/og:image" content="(.*?)"/);
            console.log("OG Image Match:", imgMatch ? imgMatch[1] : "None");
        } else {
            console.log("Fetch failed with status:", status);
        }
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

testExtraction();
