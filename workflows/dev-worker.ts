import { workflowTasks } from "./index";

console.log(`Relay fake worker ready with ${workflowTasks.length} registered recipe tasks.`);
console.log("Local API routes enqueue in-process jobs; Render runs these task registrations in production.");
