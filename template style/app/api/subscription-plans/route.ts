import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "") ||
                  request.cookies.get("access_token")?.value;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const plansResponse = await fetch(`${getBackendUrl()}/api/credits/pricing/subscription-plans`, {
      method: "GET",
      headers,
    });

    if (!plansResponse.ok) {
      const error = await plansResponse.text();
      return NextResponse.json(
        { error: error || "Failed to fetch subscription plans" },
        { status: plansResponse.status }
      );
    }

    const plansData = await plansResponse.json();
    const subscriptionPlans = plansData.data?.subscription_plans || {};
    
    const plansWithAvailability: Record<string, any> = {};
    
    Object.entries(subscriptionPlans).forEach(([key, plan]: [string, any]) => {
      plansWithAvailability[key] = {
        ...plan,
        available: plan.available ?? (key === 'creator'),
        coming_soon: plan.coming_soon ?? (key !== 'creator')
      };
    });

    return NextResponse.json({
      success: true,
      plans: plansWithAvailability
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

