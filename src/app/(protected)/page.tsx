import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { GoalTree } from "@/models/GoalTree";
import { toTreeDTO } from "@/lib/api/serializers";
import { buildForestData } from "@/lib/forest/build";
import { TreeGarden } from "@/components/tree/TreeGarden";

export default async function HomePage() {
  // (protected) layout 已驗證登入，這裡 session 必定存在
  const session = (await getSession())!;

  await connectDB();
  const [trees, forest] = await Promise.all([
    GoalTree.find({ userId: session.sub }).sort({ createdAt: -1 }),
    buildForestData(session.sub),
  ]);

  return (
    <TreeGarden initialTrees={trees.map(toTreeDTO)} initialForest={forest} />
  );
}
