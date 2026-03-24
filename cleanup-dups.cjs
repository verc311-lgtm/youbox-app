const https = require('https');

const url = 'https://pznponymhusxgrwbahid.supabase.co/rest/v1/paquetes?select=id,tracking,created_at';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

function fetchPackages() {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
}

function deletePackage(id) {
    return new Promise((resolve, reject) => {
        const req = https.request(`https://pznponymhusxgrwbahid.supabase.co/rest/v1/paquetes?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': apiKey,
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            resolve(res.statusCode);
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        const pkgs = await fetchPackages();
        const groups = {};
        for (const p of pkgs) {
            if (!groups[p.tracking]) groups[p.tracking] = [];
            groups[p.tracking].push(p);
        }

        let deletedCount = 0;
        for (const tracking in groups) {
            const g = groups[tracking];
            if (g.length > 1) {
                // Sort by created_at (oldest first)
                g.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                // Keep the first (oldest), delete the rest
                for (let i = 1; i < g.length; i++) {
                    console.log(`Deleting duplicate tracking ${tracking} (ID: ${g[i].id})`);
                    await deletePackage(g[i].id);
                    deletedCount++;
                }
            }
        }
        console.log(`Finished cleaning up. Deleted ${deletedCount} duplicate packages.`);
    } catch (err) {
        console.error(err);
    }
}

run();
