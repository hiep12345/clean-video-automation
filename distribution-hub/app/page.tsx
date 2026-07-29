import { DistributionHub } from "./distribution-hub";
import { requireAuthenticatedUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAuthenticatedUser("/");
  return <DistributionHub />;
}
