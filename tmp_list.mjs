import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: "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" });
async function test() {
  try {
    const list = await anthropic.models.list();
    console.log("AVAILABLE MODELS:");
    for (const m of list.data) {
       console.log(m.id);
    }
  } catch (e) {
    console.error(e.message);
  }
}
test();
