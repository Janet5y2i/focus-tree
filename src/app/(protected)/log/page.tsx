import { getSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import {
  toMicroLogDTO,
  toNodeDTO,
  toTreeDTO,
} from "@/lib/api/serializers";
import { MicroLogPanel } from "@/components/log/MicroLogPanel";
import { GoalTree } from "@/models/GoalTree";
import { GoalNode } from "@/models/GoalNode";
import { MicroLog } from "@/models/MicroLog";

export default async function LogPage() {
  const session = (await getSession())!;
  await connectDB();

  const trees = await GoalTree.find({
    userId: session.sub,
    status: { $ne: "archived" },
  }).sort({ createdAt: -1 });

  const [logs, recurringTasks] = await Promise.all([
    MicroLog.find({ userId: session.sub }).sort({ loggedAt: -1 }).limit(50),
    GoalNode.find({
      userId: session.sub,
      treeId: { $in: trees.map((tree) => tree._id) },
      type: "task",
      isRecurring: true,
    }).sort({ updatedAt: -1 }),
  ]);

  return (
    <MicroLogPanel
      initialTrees={trees.map(toTreeDTO)}
      initialLogs={logs.map(toMicroLogDTO)}
      initialRecurringTasks={recurringTasks.map(toNodeDTO)}
    />
  );
}
