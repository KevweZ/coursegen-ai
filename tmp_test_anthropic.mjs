import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: "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" });

async function test() {
  try {
    const models = ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    for (const m of models) {
      try {
        await anthropic.messages.create({
            model: m,
            max_tokens: 10,
            messages: [{role: 'user', content: "Hi"}]
        });
        console.log(`[SUCCESS] ${m}`);
      } catch (e) {
        console.log(`[FAIL] ${m}: ${e.message}`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
test();
