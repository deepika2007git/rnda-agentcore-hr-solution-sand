// src/agentcore.ts
// Simple non-streaming helper to call AgentCore and return a single string

const region = (import.meta as any).env.VITE_REGION || 'us-west-2';
const agentRuntimeArn = (import.meta as any).env.VITE_AGENT_RUNTIME_ARN;
const isLocalDev = (import.meta as any).env.VITE_LOCAL_DEV === 'true';
const localAgentUrl = (import.meta as any).env.VITE_AGENT_RUNTIME_URL || '/api';

export interface InvokeAgentRequest {
  prompt: string;
}

export interface InvokeAgentResponse {
  response: string;
}

async function callLocalAgentCore(prompt: string): Promise<string> {
  console.log('Invoking LOCAL AgentCore:', { url: localAgentUrl, prompt });

  const response = await fetch(`${localAgentUrl}/invocations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  console.log('Local AgentCore status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Local AgentCore error response:', errorText);
    throw new Error(
      `Local AgentCore invocation failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  let data: any;
  try {
    data = await response.json();
    console.log('Local AgentCore JSON:', data);
  } catch (parseError) {
    console.error('Failed to parse JSON from local AgentCore:', parseError);
    const textResponse = await response.text();
    console.log('Raw response text:', textResponse);
    throw new Error(
      `Invalid JSON response from local AgentCore: ${textResponse}`,
    );
  }

  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object') {
    return (
      (data as any).result ||
      (data as any).response ||
      (data as any).content ||
      (data as any).text ||
      (data as any).message ||
      (data as any).output ||
      JSON.stringify(data)
    );
  }
  return 'No response from agent';
}

async function callRuntime(prompt: string): Promise<string> {
  if (!agentRuntimeArn) {
    throw new Error(
      'AgentCore Runtime ARN not configured. Please check deployment.',
    );
  }

  const { getAccessToken } = await import('./auth');
  const jwtToken = await getAccessToken();
  if (!jwtToken) {
    throw new Error('Not authenticated - no access token available');
  }

  const encodedRuntimeArn = encodeURIComponent(agentRuntimeArn);

  const url = `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedRuntimeArn}/invocations?qualifier=DEFAULT`;

  console.log('Invoking RUNTIME AgentCore:', { url, prompt });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      mode: 'single',
      input: { prompt },
    }),
  });

  console.log('Runtime AgentCore status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Runtime AgentCore error response:', errorText);
    throw new Error(
      `AgentCore invocation failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  let data: any;
  try {
    data = await response.json();
    console.log('Runtime AgentCore JSON:', data);
  } catch (parseError) {
    console.error('Failed to parse JSON from runtime AgentCore:', parseError);
    const textResponse = await response.text();
    console.log('Raw response text:', textResponse);
    throw new Error(
      `Invalid JSON response from AgentCore: ${textResponse}`,
    );
  }

  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object') {
    return (
      (data as any).result ||
      (data as any).response ||
      (data as any).content ||
      (data as any).text ||
      (data as any).message ||
      (data as any).output ||
      JSON.stringify(data)
    );
  }
  return 'No response from agent';
}

export const invokeAgent = async (
  request: InvokeAgentRequest,
): Promise<InvokeAgentResponse> => {
  const { prompt } = request;

  try {
    const text = isLocalDev
      ? await callLocalAgentCore(prompt)
      : await callRuntime(prompt);

    console.log('Final agent text:', text);
    return { response: text };
  } catch (err: any) {
    console.error('invokeAgent error:', err);
    throw new Error(err.message || 'Failed to invoke agent');
  }
};

