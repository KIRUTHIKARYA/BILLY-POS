import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createShop } from "@/services/shop-service";
import type { CreateShopInput } from "@/types/shop";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateShopInput;
  const result = await createShop(body);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({ shopId: result.shopId }, { status: 201 });
}
