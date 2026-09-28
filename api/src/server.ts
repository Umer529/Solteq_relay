import { createApp } from "./app.js";
import { getConfig } from "./config.js";

const { PORT } = getConfig();
const app = createApp();

app.listen(PORT, () => {
  console.log(`Relay API listening on http://localhost:${PORT}`);
});
