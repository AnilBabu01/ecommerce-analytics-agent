import { NextResponse } from "next/server";

const ELASTIC_URL = process.env.ELASTIC_KIBANA_URL!;
const API_KEY = process.env.ELASTIC_API_KEY!;
const ELASTIC_AGENT_ID = process.env.ELASTIC_AGENT_ID!;
export async function GET() {
  try {
    const response = await fetch(
      `${ELASTIC_URL}/api/agent_builder/conversations?agent_id=${ELASTIC_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `ApiKey ${API_KEY}`,
          "kbn-xsrf": "true",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch conversations",
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