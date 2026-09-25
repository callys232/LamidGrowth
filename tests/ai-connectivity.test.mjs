import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openAIProvider, anthropicProvider, multiProvider } from '../src/app/ai.mjs';

test('insufficient provider credits are reported as a billing issue rather than a generic server error', async () => {
  const provider = anthropicProvider({
    apiKey: 'test',
    model: 'test',
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'Your credit balance is too low to access the Anthropic API.' },
      }),
    }),
  });
  await assert.rejects(provider.review({ sources: [] }), (error) => {
    assert.equal(error.status, 503);
    assert.match(error.message, /insufficient API credits/);
    assert.match(error.message, /billing settings/);
    return true;
  });
});

test('invalid provider workspace returns an actionable error without exposing account details', async () => {
  const provider = anthropicProvider({
    apiKey: 'test',
    model: 'test',
    workspaceId: 'invalid',
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Workspace private-account-id not found.' } }),
    }),
  });
  await assert.rejects(provider.review({ sources: [] }), (error) => {
    assert.equal(error.status, 503);
    assert.equal(error.providerStatus, 404);
    assert.match(error.message, /configured AI workspace/);
    assert.ok(!error.message.includes('private-account-id'));
    return true;
  });
});

test('provider auth, quota and gateway failures retain actionable status through failover', async () => {
  for (const [status, expected] of [
    [401, /credentials/],
    [429, /usage limit/],
    [502, /temporarily unavailable/],
  ]) {
    const provider = openAIProvider({
      apiKey: 'test',
      model: 'test',
      fetchImpl: async () => ({ ok: false, status }),
    });
    await assert.rejects(multiProvider([provider, provider]).review({ sources: [] }), (error) => {
      assert.equal(error.status, 503);
      assert.match(error.message, expected);
      return true;
    });
  }
});

/**
 * Sends a message prompt to the AI model provider, logs request/response diagnostic events,
 * and returns the reply from the model.
 */
export async function sendAiMessage(provider, messagePrompt, sources = [], logger = console.log) {
  const startTime = Date.now();

  logger(
    JSON.stringify({
      event: 'ai_message_sent',
      provider: provider?.name || 'unconfigured',
      model: provider?.model || 'none',
      prompt: messagePrompt,
      sourceCount: sources.length,
      timestamp: new Date().toISOString(),
    }),
  );

  if (!provider) {
    const errorMsg = 'AI Provider is unconfigured (missing API key or model settings)';
    logger(
      JSON.stringify({
        event: 'ai_message_failed',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      }),
    );
    throw new Error(errorMsg);
  }

  try {
    const context = { question: messagePrompt, sources };
    const result = await provider.review(context);
    const latencyMs = Date.now() - startTime;

    logger(
      JSON.stringify({
        event: 'ai_reply_received',
        provider: provider.name,
        model: provider.model,
        latencyMs,
        responseId: result.responseId || null,
        reply: result.review,
        usage: result.usage || null,
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      ok: true,
      provider: provider.name,
      model: provider.model,
      latencyMs,
      reply: result.review,
      usage: result.usage,
      responseId: result.responseId,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger(
      JSON.stringify({
        event: 'ai_message_failed',
        provider: provider.name,
        model: provider.model,
        latencyMs,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    );
    throw error;
  }
}

/**
 * Executes an AI connectivity check against the given provider and logs detailed diagnostics.
 */
export async function checkAiConnectivity(provider, logger = console.log) {
  try {
    return await sendAiMessage(provider, 'AI connectivity check', [], logger);
  } catch (error) {
    return { ok: false, provider: provider?.name, model: provider?.model, error: error.message };
  }
}

test('sends a message to the AI model and receives a valid return reply with structured logs', async () => {
  const logs = [];
  const mockLogger = (entry) => logs.push(JSON.parse(entry));

  const promptMessage =
    'Assess the strategic alignment of expanding our enterprise service tier in Q4';
  const mockSources = [
    { id: 'obj-99', version: 1, kind: 'objective', data: { title: 'Enterprise Expansion' } },
  ];

  const mockFetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const requestBody = JSON.parse(options.body);
    const inputPayload = JSON.parse(requestBody.input);

    assert.equal(inputPayload.question, promptMessage);
    assert.equal(inputPayload.sources.length, 1);
    assert.equal(inputPayload.sources[0].id, 'obj-99');

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'resp_message_test_777',
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    summary: 'Enterprise expansion aligns well with Q4 revenue goals.',
                    assumptions: ['Dedicated account managers will be assigned.'],
                    suggestions: [
                      {
                        title: 'Draft SLA Agreement',
                        rationale: 'Required for enterprise clients',
                      },
                      { title: 'Review Security Policy', rationale: 'Enterprise SOC2 compliance' },
                    ],
                    evidenceIds: ['obj-99'],
                  }),
                },
              ],
            },
          ],
          usage: { prompt_tokens: 210, completion_tokens: 85, total_tokens: 295 },
        };
      },
    };
  };

  const provider = openAIProvider({
    apiKey: 'test-openai-key',
    model: 'gpt-4o',
    fetchImpl: mockFetch,
  });

  const response = await sendAiMessage(provider, promptMessage, mockSources, mockLogger);

  // Assert return reply structure
  assert.equal(response.ok, true);
  assert.equal(response.responseId, 'resp_message_test_777');
  assert.equal(response.reply.summary, 'Enterprise expansion aligns well with Q4 revenue goals.');
  assert.equal(response.reply.suggestions.length, 2);
  assert.equal(response.reply.suggestions[0].title, 'Draft SLA Agreement');
  assert.deepEqual(response.reply.evidenceIds, ['obj-99']);

  // Assert structured logging trace
  assert.equal(logs.length, 2);
  assert.equal(logs[0].event, 'ai_message_sent');
  assert.equal(logs[0].prompt, promptMessage);
  assert.equal(logs[0].sourceCount, 1);

  assert.equal(logs[1].event, 'ai_reply_received');
  assert.equal(logs[1].responseId, 'resp_message_test_777');
  assert.equal(logs[1].reply.summary, 'Enterprise expansion aligns well with Q4 revenue goals.');
  assert.equal(logs[1].usage.total_tokens, 295);
});

test('OpenAI provider AI connectivity check records successful request and usage logs', async () => {
  const logs = [];
  const mockLogger = (entry) => logs.push(JSON.parse(entry));

  const mockFetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.method, 'POST');
    assert.ok(options.headers.Authorization.includes('test-openai-key'));

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'resp_openai_test_123',
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    summary: 'OpenAI connectivity check passed.',
                    assumptions: [],
                    suggestions: [{ title: 'Verify prompt', rationale: 'Checks system prompts' }],
                    evidenceIds: [],
                  }),
                },
              ],
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
        };
      },
    };
  };

  const provider = openAIProvider({
    apiKey: 'test-openai-key',
    model: 'gpt-4o-mini',
    fetchImpl: mockFetch,
  });

  const res = await checkAiConnectivity(provider, mockLogger);

  assert.equal(res.ok, true);
  assert.equal(res.provider, 'OpenAI');
  assert.equal(res.model, 'gpt-4o-mini');

  assert.equal(logs.length, 2);
  assert.equal(logs[0].event, 'ai_message_sent');
  assert.equal(logs[1].event, 'ai_reply_received');
  assert.equal(logs[1].provider, 'OpenAI');
  assert.equal(logs[1].responseId, 'resp_openai_test_123');
  assert.equal(logs[1].usage.total_tokens, 165);
});

test('Anthropic provider AI connectivity check records successful response logs', async () => {
  const logs = [];
  const mockLogger = (entry) => logs.push(JSON.parse(entry));

  const mockFetch = async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['x-api-key'], 'test-anthropic-key');

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'msg_anthropic_test_456',
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              name: 'objective_review',
              input: {
                summary: 'Anthropic connectivity check passed.',
                assumptions: [],
                suggestions: [{ title: 'Check limits', rationale: 'Verify token limits' }],
                evidenceIds: [],
              },
            },
          ],
          usage: { input_tokens: 95, output_tokens: 35 },
        };
      },
    };
  };

  const provider = anthropicProvider({
    apiKey: 'test-anthropic-key',
    model: 'claude-3-5-sonnet',
    fetchImpl: mockFetch,
  });

  const res = await checkAiConnectivity(provider, mockLogger);

  assert.equal(res.ok, true);
  assert.equal(res.provider, 'Anthropic');
  assert.equal(res.model, 'claude-3-5-sonnet');

  assert.equal(logs.length, 2);
  assert.equal(logs[0].event, 'ai_message_sent');
  assert.equal(logs[1].event, 'ai_reply_received');
  assert.equal(logs[1].provider, 'Anthropic');
  assert.equal(logs[1].responseId, 'msg_anthropic_test_456');
  assert.equal(logs[1].usage.input_tokens, 95);
});

test('MultiProvider AI connectivity failover logs primary failure and fallback success', async () => {
  const logs = [];
  const mockLogger = (entry) => logs.push(JSON.parse(entry));

  const failingOpenAiFetch = async () => ({
    ok: false,
    status: 503,
  });

  const succeedingAnthropicFetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        id: 'msg_fallback_789',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            name: 'objective_review',
            input: {
              summary: 'Fallback connectivity passed.',
              assumptions: [],
              suggestions: [],
              evidenceIds: [],
            },
          },
        ],
        usage: { input_tokens: 80, output_tokens: 30 },
      };
    },
  });

  const primary = openAIProvider({
    apiKey: 'primary-key',
    model: 'gpt-4o',
    fetchImpl: failingOpenAiFetch,
  });

  const fallback = anthropicProvider({
    apiKey: 'fallback-key',
    model: 'claude-3-5-haiku',
    fetchImpl: succeedingAnthropicFetch,
  });

  const combinedProvider = multiProvider([primary, fallback]);

  const res = await checkAiConnectivity(combinedProvider, mockLogger);

  assert.equal(res.ok, true);
  assert.equal(res.provider, 'OpenAI → Anthropic');

  assert.equal(logs.length, 2);
  assert.equal(logs[0].event, 'ai_message_sent');
  assert.equal(logs[1].event, 'ai_reply_received');
  assert.equal(logs[1].responseId, 'msg_fallback_789');
});

test('AI connectivity check handles and logs network failure when all providers fail', async () => {
  const logs = [];
  const mockLogger = (entry) => logs.push(JSON.parse(entry));

  const errorFetch = async () => {
    throw new Error('getaddrinfo ENOTFOUND api.openai.com');
  };

  const failingProvider = openAIProvider({
    apiKey: 'invalid-key',
    model: 'gpt-4o',
    fetchImpl: errorFetch,
  });

  const res = await checkAiConnectivity(failingProvider, mockLogger);

  assert.equal(res.ok, false);
  assert.equal(res.provider, 'OpenAI');
  assert.ok(res.error.includes('ENOTFOUND'));

  assert.equal(logs.length, 2);
  assert.equal(logs[0].event, 'ai_message_sent');
  assert.equal(logs[1].event, 'ai_message_failed');
  assert.ok(logs[1].error.includes('ENOTFOUND'));
  assert.ok(typeof logs[1].latencyMs === 'number');
});

test('Unconfigured AI provider returns unconfigured status and logs error', async () => {
  const logs = [];
  const mockLogger = (entry) => logs.push(JSON.parse(entry));

  const unconfiguredProvider = openAIProvider({ apiKey: '', model: '' });

  const res = await checkAiConnectivity(unconfiguredProvider, mockLogger);

  assert.equal(res.ok, false);

  assert.equal(logs.length, 2);
  assert.equal(logs[0].event, 'ai_message_sent');
  assert.equal(logs[1].event, 'ai_message_failed');
});
