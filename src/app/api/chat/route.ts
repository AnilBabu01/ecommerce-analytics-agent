import { NextRequest, NextResponse } from "next/server";

const ELASTIC_URL = process.env.ELASTIC_KIBANA_URL!;
const API_KEY = process.env.ELASTIC_API_KEY!;
const AGENT_ID = process.env.ELASTIC_AGENT_ID || "elk-log-analysis-agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const input = body.input;
    const conversationId = body.conversation_id;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "input is required" },
        { status: 400 }
      );
    }

    const elasticBody: Record<string, string> = {
      agent_id: AGENT_ID,
      input,
    };

    // Continue an existing conversation
    if (conversationId) {
      elasticBody.conversation_id = conversationId;
    }

    const response = await fetch(
      `${ELASTIC_URL}/api/agent_builder/converse`,
      {
        method: "POST",
        headers: {
          Authorization: `ApiKey ${API_KEY}`,
          "Content-Type": "application/json",
          "kbn-xsrf": "true",
        },
        body: JSON.stringify(elasticBody),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Elastic Agent Builder request failed",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}