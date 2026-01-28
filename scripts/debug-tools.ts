import { getAgentTools } from "../src/services/actions/tools";

const tools = getAgentTools();
console.log(JSON.stringify(tools, null, 2));