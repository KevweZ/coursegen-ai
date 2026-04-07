import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic({ apiKey: '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' });

async function test() {
  try {
    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{role: 'user', content: 'Hi'}]
    });
    console.log(r);
  } catch (e) {
    console.error(e.message);
  }
}
test();
