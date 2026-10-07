import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anthropicProvider, openAIProvider, geminiProvider } from '../src/app/ai.mjs';

// A realistic services contract or SOW runs well past the 4,000 characters a planning review is
// capped at. Document drafting must not be squeezed into the planning-review shape.
const longDocument = `SERVICES AGREEMENT\n\n${'1. Scope. The contractor will deliver the agreed work. '.repeat(250)}`;
const review = (summary) => ({ summary, assumptions: [], suggestions: [], evidenceIds: [] });

function capture(responseFor) {
  const sent = [];
  const fetchImpl = async (url, options) => {
    sent.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => responseFor() };
  };
  return { sent, fetchImpl };
}

test('Anthropic document mode drafts with document instructions and room for a full document', async () => {
  const { sent, fetchImpl } = capture(() => ({
    id: 'msg_1',
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', name: 'objective_review', input: review(longDocument) }],
  }));
  const provider = anthropicProvider({ apiKey: 'k', model: 'm', fetchImpl });
  const result = await provider.review(
    { question: 'Draft a contract', sources: [] },
    { mode: 'document' },
  );
  assert.equal(result.review.summary, longDocument);
  assert.ok(sent[0].max_tokens >= 8000, `max_tokens ${sent[0].max_tokens}`);
  assert.match(sent[0].system, /draft/i);
  assert.doesNotMatch(sent[0].system, /You review an objective/);
});

test('planning reviews keep their bounded shape when no mode is given', async () => {
  const { sent, fetchImpl } = capture(() => ({
    id: 'msg_2',
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', name: 'objective_review', input: review(longDocument) }],
  }));
  const provider = anthropicProvider({ apiKey: 'k', model: 'm', fetchImpl });
  await assert.rejects(provider.review({ question: 'Review', sources: [] }));
  assert.match(sent[0].system, /You review an objective/);
});

test('OpenAI document mode uses document instructions and a larger output budget', async () => {
  const { sent, fetchImpl } = capture(() => ({
    id: 'resp_1',
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(review(longDocument)) }],
      },
    ],
  }));
  const provider = openAIProvider({ apiKey: 'k', model: 'm', fetchImpl });
  const result = await provider.review({ question: 'Draft', sources: [] }, { mode: 'document' });
  assert.equal(result.review.summary, longDocument);
  assert.ok(sent[0].max_output_tokens >= 8000);
  assert.match(sent[0].instructions, /draft/i);
});

test('Gemini document mode uses document instructions and a larger output budget', async () => {
  const { sent, fetchImpl } = capture(() => ({
    responseId: 'g1',
    candidates: [{ content: { parts: [{ text: JSON.stringify(review(longDocument)) }] } }],
  }));
  const provider = geminiProvider({ apiKey: 'k', model: 'm', fetchImpl });
  const result = await provider.review({ question: 'Draft', sources: [] }, { mode: 'document' });
  assert.equal(result.review.summary, longDocument);
  assert.ok(sent[0].generationConfig.maxOutputTokens >= 8000);
  assert.match(sent[0].systemInstruction.parts[0].text, /draft/i);
});
