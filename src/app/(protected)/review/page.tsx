import { getSession } from "@/lib/auth/session";
import { getRequestLocale } from "@/i18n/locale-server";
import { connectDB } from "@/lib/db/mongoose";
import { buildReviewStats } from "@/lib/review/aggregate";
import { generateReviewSummary } from "@/lib/ai/review";
import { reviewPresetPeriodSchema } from "@/lib/validations/review";
import { ReviewPanel } from "@/components/review/ReviewPanel";
import { User } from "@/models/User";
import type { ReviewResponse } from "@/lib/types/review";

export default async function ReviewPage() {
  const locale = await getRequestLocale();
  const session = (await getSession())!;
  await connectDB();

  const user = await User.findById(session.sub);
  const parsed = reviewPresetPeriodSchema.safeParse(
    user?.preferences.reviewCadence ?? "weekly",
  );
  const period = parsed.success ? parsed.data : "weekly";

  const stats = await buildReviewStats(session.sub, period);
  const { summary, generatedBy } = await generateReviewSummary(
    user?.displayName ?? (locale === "en" ? "You" : "你"),
    period,
    stats,
    locale,
  );

  const initialReview: ReviewResponse = {
    period,
    stats,
    summary,
    generatedBy,
  };

  return <ReviewPanel initialReview={initialReview} />;
}
