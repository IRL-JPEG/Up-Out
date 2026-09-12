require('dotenv').config();
const { createApp, MODEL } = require('./api');
const port = process.env.PORT || 3000;
createApp().listen(port, () => console.log(`Up and Out on http://localhost:${port} · ${MODEL}`));
