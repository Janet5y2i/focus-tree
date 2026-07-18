import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { toMicroLogDTO, toTreeDTO } from "@/lib/api/serializers";
import { MicroLogPanel } from "@/components/log/MicroLogPanel";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";

export default async function LogPage() {
  const session = (await getSession())!;
  await connectDB();

  const [trees, logs] = await Promise.all([
    GoalTree.find({
      userId: session.sub,
      status: { $ne: "archived" },
    }).sort({ createdAt: -1 }),
    MicroLog.find({ userId: session.sub }).sort({ loggedAt: -1 }).limit(50),
  ]);

  return (
    <MicroLogPanel
      initialTrees={trees.map(toTreeDTO)}
      initialLogs={logs.map(toMicroLogDTO)}
    />
  );
}
