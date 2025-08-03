require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// Konfigurasi CORS: Hanya izinkan permintaan dari URL frontend Anda
app.use(cors());
app.use(express.json());

// --- API ENDPOINTS ---

// 1. Menyimpan link baru (bisa video atau adsterra)
app.post('/api/save-link', async (req, res) => {
    const { destinationUrl, type = 'video' } = req.body;
    if (!destinationUrl) return res.status(400).json({ error: 'destinationUrl required' });

    try {
        const shortId = Math.random().toString(36).substring(2, 11);
        const { data, error } = await supabase
            .from('links')
            .insert([{ short_id: shortId, destination_url: destinationUrl, type: type }])
            .select('short_id').single();

        if (error) throw error;
        res.status(200).json({ id: data.short_id });
    } catch (error) {
        console.error('Save Link Error:', error);
        res.status(500).json({ error: 'Database save failed.' });
    }
});

// 2. Mengambil detail link berdasarkan ID
app.get('/api/get-link-details', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    try {
        const { data, error } = await supabase
            .from('links')
            .select('destination_url, type')
            .eq('short_id', id).single();

        if (error || !data) throw new Error('Link not found');
        res.status(200).json({ url: data.destination_url, type: data.type });
    } catch (error) {
        console.error('Get Link Details Error:', error);
        res.status(404).json({ error: error.message });
    }
});

// 3. Generator link untuk rotator
app.post('/api/create-rotated-links', async (req, res) => {
    const { adsterraLinks = [], videoCount = 4 } = req.body;
    try {
        const generatedIds = [];
        for (const adLink of adsterraLinks) {
            const adShortId = Math.random().toString(36).substring(2, 11);
            const { error } = await supabase.from('links').insert([{ short_id: adShortId, destination_url: adLink, type: 'adsterra' }]);
            if (error) throw error;
            generatedIds.push(adShortId);
        }
        const { data: videos, error: rpcError } = await supabase.rpc('get_random_links', { p_type: 'video', p_count: videoCount });
        if (rpcError) throw rpcError;
        
        videos.forEach(v => generatedIds.push(v.short_id));
        
        res.status(200).json({ ids: generatedIds.sort(() => 0.5 - Math.random()) });
    } catch (error) {
        console.error('Create Rotated Links Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;