import { NextRequest } from "next/server";
import { GET as portalGet } from "../portal/photo-compare/route";

export async function GET(request: NextRequest) {
  return portalGet(request);
}
