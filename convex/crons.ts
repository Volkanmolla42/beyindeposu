import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("analytics retention", { hours: 6 }, internal.analytics.prune, {});
export default crons;
