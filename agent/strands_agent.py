# agent/strands_agent.py
#
# Simple version: extract prompt from AgentCore payload and call
# lookup_hr_recommendation().

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from hr_tools import lookup_hr_recommendation

app = BedrockAgentCoreApp()


@app.entrypoint
def invoke(payload: dict):
    """
    Bedrock AgentCore entrypoint.

    Expected payload (from your frontend):

      {
        "mode": "single",
        "input": {
          "prompt": "Employee number does not match in Oracle"
        },
        ...
      }
    """
    # AgentCore wraps your input under the "input" key
    input_obj = payload.get("input") or {}

    # Try the new structure first, then fall back to old one for safety
    prompt = (
        input_obj.get("prompt")
        or payload.get("prompt")
        or ""
    )

    session_id = payload.get("session_id")

    hr_text = lookup_hr_recommendation(prompt)

    return {
        "result": hr_text,
        "session_id": session_id,
    }


if __name__ == "__main__":
    app.run()

