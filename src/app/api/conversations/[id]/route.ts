import { NextRequest, NextResponse } from "next/server";

const ELASTIC_URL = process.env.ELASTIC_KIBANA_URL!;
const API_KEY = process.env.ELASTIC_API_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(
      `${ELASTIC_URL}/api/agent_builder/conversations/${id}`,
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
          error: "Failed to fetch conversation",
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