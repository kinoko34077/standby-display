// Parse the same syntax level as the app before attempting its module graph.
const boot = window.StandbyBoot;
boot.moduleParsed = ({ ready: true })?.ready ?? false;
import("./app.mjs").catch(() => boot.fallback());
