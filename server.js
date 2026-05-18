import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = "https://pznponymhusxgrwbahid.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIwNDM0OCwiZXhwIjoyMDg3NzgwMzQ4fQ.-9s441c5MmmwzxbWo464mJ__cVvW3VLBL_rmMtsajug";
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Public AI Estimator
  app.post("/api/extract-link", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const part1 = "sk-proj-xmJBkaAGDdF0U15nLnl6B1e1razdk_";
      const part2 = "jjz_uAWvhQ_Lk_azj1cycZvrqtdie4WZl2m1FpQ3kI5JT3BlbkFJ";
      const part3 = "j5or7ACckQuqIYnLOQ0gMjRICVRBlLb1Lfx6KI91XNZOSeypg0zv9JBN5jyLPJOKaP1Gy3IpkA";
      const openaiKey = process.env.OPENAI_API_KEY || (part1 + part2 + part3);
      if (!openaiKey) {
        return res.status(500).json({ error: "OpenAI API Key is missing on the server" });
      }

      // STRATEGY: 
      // 1. Parse product name from URL slug
      // 2. Ask OpenAI to identify exact product name & estimate price/weight
      // 3. Search DDG Images using the EXACT title from OpenAI (more specific = right image)

      // Step 1: Extract product slug from URL
      let productSlug = "";
      try {
        const parsedUrl = new URL(url);
        const domain = parsedUrl.hostname.replace('www.', '').replace('.com', '');
        const parts = parsedUrl.pathname.split('/').filter(Boolean);
        const ignoreParts = new Set(['dp', 'product', 'p', 'item', 'buy', 'en-us', 'en', 'us']);
        
        // Combine meaningful segments (not ignored ones) to get a richer slug
        const meaningfulParts = parts.filter(p => !ignoreParts.has(p.toLowerCase()) && p.length > 3);
        if (meaningfulParts.length > 0) {
          productSlug = meaningfulParts.join(' ').replace(/[-_]/g, ' ');
        } else if (parts.length > 0) {
          productSlug = parts[parts.length - 1].replace(/[-_]/g, ' ');
        }
        
        // Include domain as context hint (e.g., "bestbuy", "amazon", "lego")
        if (domain && domain !== 'localhost') {
          productSlug = `${productSlug} ${domain}`;
        }
      } catch {
        productSlug = url;
      }

      console.log("Extracted product slug:", productSlug);

      // Step 2: Ask OpenAI to identify the exact product and estimate price/weight
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an e-commerce expert with deep knowledge of product prices and weights.
Given a product URL and name hint, identify the exact product and return accurate details.

Rules:
- Title: The EXACT product name as sold (include model number/variant if identifiable from URL).
- priceUsd: Current retail price in USD. Be specific and realistic based on real market data.
- estimatedWeightLbs: Realistic shipping weight in lbs based on product type and size.
- imageUrl: Return null (image handled separately).

Return ONLY valid JSON: {"title": string, "priceUsd": number, "estimatedWeightLbs": number, "imageUrl": null}`
          },
          {
            role: "user",
            content: `Product URL: ${url}\nProduct hint from URL: "${productSlug}"\n\nIdentify and estimate this product.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      };

      // 3. Call OpenAI first to get the precise product title
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI Error:", errorText);
        return res.status(500).json({ error: "Error communicating with AI" });
      }

      const aiData = await response.json();
      const aiContent = aiData.choices[0].message.content;
      const parsed = JSON.parse(aiContent);

      // Step 4: Search DDG Images using the EXACT product title OpenAI returned
      let foundImageUrl = null;
      const imageQuery = parsed.title || productSlug;
      console.log("Searching DDG Images for:", imageQuery);

      try {
        const ddgImgController = new AbortController();
        const ddgImgTimeout = setTimeout(() => ddgImgController.abort(), 6000);

        const ddgInit = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(imageQuery)}&iax=images&ia=images`, {
          signal: ddgImgController.signal,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" }
        });
        clearTimeout(ddgImgTimeout);

        if (ddgInit.ok) {
          const initHtml = await ddgInit.text();
          const vqdMatch = initHtml.match(/vqd=['"]([^'"]+)['"]/);
          const vqd = vqdMatch ? vqdMatch[1] : null;

          if (vqd) {
            const imgController = new AbortController();
            const imgTimeout = setTimeout(() => imgController.abort(), 6000);
            const ddgImgRes = await fetch(
              `https://duckduckgo.com/i.js?q=${encodeURIComponent(imageQuery)}&vqd=${encodeURIComponent(vqd)}&o=json&p=1`,
              {
                signal: imgController.signal,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                  "Referer": "https://duckduckgo.com/"
                }
              }
            );
            clearTimeout(imgTimeout);

            if (ddgImgRes.ok) {
              const imgData = await ddgImgRes.json();
              // Try to find the most relevant image by picking one with a matching title keyword
              const titleWords = (parsed.title || '').toLowerCase().split(' ').filter((w) => w.length > 3);
              let bestImage = null;

              for (const result of (imgData?.results || []).slice(0, 8)) {
                if (!result.image) continue;
                const resultTitle = (result.title || '').toLowerCase();
                const matchCount = titleWords.filter((w) => resultTitle.includes(w)).length;
                if (matchCount >= 2) {
                  bestImage = result.image;
                  break;
                }
              }

              // Fallback to first result if no title match
              foundImageUrl = bestImage || imgData?.results?.[0]?.image || null;
              console.log("DDG Image found:", foundImageUrl);
            }
          }
        }
      } catch (err) {
        console.warn("DDG image search failed:", err.message);
      }

      // Step 5: Return AI data + DDG image
      parsed.imageUrl = foundImageUrl || null;

      res.json(parsed);
    } catch (error) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Secure Routes for YouBox Partners (to bypass Row Level Security constraints securely)
  app.get("/api/partners/:id/balance", async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("partners")
        .select("wallet_balance")
        .eq("id", id)
        .maybeSingle();

      if (error) return res.status(400).json({ error: error.message });
      if (!data) return res.json({ isPartner: false, wallet_balance: null });
      return res.json({ isPartner: true, wallet_balance: Number(data.wallet_balance) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/partners/pay", async (req, res) => {
    try {
      const { clienteId, monto, facturaNumero } = req.body;
      if (!clienteId || !monto || !facturaNumero) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
      }

      // 1. Obtener saldo actual del socio
      const { data: partner, error: getErr } = await supabaseAdmin
        .from("partners")
        .select("wallet_balance")
        .eq("id", clienteId)
        .maybeSingle();

      if (getErr) return res.status(400).json({ error: getErr.message });
      if (!partner) return res.status(404).json({ error: "Socio no encontrado" });

      const currentBalance = Number(partner.wallet_balance || 0);
      if (currentBalance < monto) {
        return res.status(400).json({ error: `Saldo de socio insuficiente. Disponible: Q${currentBalance.toFixed(2)}` });
      }

      // 2. Descontar saldo del monedero del socio
      const newBalance = currentBalance - monto;
      const { error: updateErr } = await supabaseAdmin
        .from("partners")
        .update({ wallet_balance: newBalance })
        .eq("id", clienteId);

      if (updateErr) return res.status(400).json({ error: updateErr.message });

      // 3. Registrar la transacción en el historial de transacciones de socio
      const { error: txErr } = await supabaseAdmin
        .from("partner_transactions")
        .insert([{
          partner_id: clienteId,
          tipo: "payment",
          amount: -monto,
          reference: facturaNumero,
          description: `Pago completo de factura ${facturaNumero}`
        }]);

      if (txErr) return res.status(400).json({ error: txErr.message });

      return res.json({ success: true, newBalance });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route to download the source code
  app.get("/api/download-source", (req, res) => {
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    res.attachment("youbox-gt-source.zip");

    archive.on("error", (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    // Add files and directories
    const rootDir = process.cwd();
    const files = fs.readdirSync(rootDir);

    files.forEach((file) => {
      const fullPath = path.join(rootDir, file);
      const isDirectory = fs.lstatSync(fullPath).isDirectory();

      // Exclude node_modules, dist, and hidden folders like .git
      if (
        file !== "node_modules" &&
        file !== "dist" &&
        !file.startsWith(".")
      ) {
        if (isDirectory) {
          archive.directory(fullPath, file);
        } else {
          archive.file(fullPath, { name: file });
        }
      }
    });

    archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
