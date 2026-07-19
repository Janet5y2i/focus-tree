import type { Locale } from "@/i18n/config";

/** 常見 API／Zod 中文錯誤 → 英文；中文語系直接回傳原文。 */
const API_ERROR_EN: Record<string, string> = {
  未登入: "Not signed in",
  "輸入資料無效": "Invalid input",
  "找不到這棵樹": "Tree not found",
  "找不到節點": "Node not found",
  "找不到這筆記錄": "Log not found",
  "使用者不存在": "User not found",
  "Email 或密碼錯誤": "Incorrect email or password",
  "此 Email 已被註冊": "This email is already registered",
  "無效的 ID": "Invalid ID",
  "無效的樹 ID": "Invalid tree ID",
  "無效的記錄 ID": "Invalid log ID",
  "沒有可更新的欄位": "Nothing to update",
  "請為這棵樹取個名字": "Please name this tree",
  "目標名稱最多 120 字": "Goal name can be at most 120 characters",
  "描述最多 500 字": "Description can be at most 500 characters",
  "請輸入名稱": "Please enter a name",
  "名稱最多 100 字": "Name can be at most 100 characters",
  "寫下剛剛完成的一件小事吧": "Write down a small thing you just completed",
  "記錄最多 300 字": "Logs can be at most 300 characters",
  "一次最多連結 12 棵目標樹": "You can link at most 12 trees at once",
  "一次連結的子目標與任務太多了": "Too many branches/tasks linked at once",
  "日期格式無效": "Invalid date format",
  "開始日期不能晚於結束日期": "Start date can’t be after end date",
  "自訂回顧需要開始與結束日期": "Custom review needs a start and end date",
  "自訂回顧範圍最多一年": "Custom review can cover at most one year",
  "回顧時間範圍無效": "Invalid review range",
  "有些目標樹不存在或無法存取": "Some trees don’t exist or can’t be accessed",
  "有些子目標或任務不存在，或不屬於所選目標樹":
    "Some branches/tasks don’t exist or don’t belong to the selected trees",
  "只有任務可以結出果實": "Only tasks can bear fruit",
  "只有任務可以設為經常性任務": "Only tasks can be recurring",
  "目標樹最多三層：任務下不能再新增子項":
    "Trees have at most three levels—tasks can’t have children",
  "找不到父節點": "Parent node not found",
  "無法載入記錄": "Couldn’t load logs",
  "儲存記錄失敗，請稍後再試": "Couldn’t save the log. Please try again.",
  "更新記錄失敗，請稍後再試": "Couldn’t update the log. Please try again.",
  "無法載入這棵樹": "Couldn’t load this tree",
  "無法載入森林": "Couldn’t load the forest",
  "更新失敗，請稍後再試": "Couldn’t update. Please try again.",
  "刪除失敗，請稍後再試": "Couldn’t delete. Please try again.",
  "新增失敗，請稍後再試": "Couldn’t add that. Please try again.",
  "種樹失敗，請稍後再試": "Couldn’t plant the tree. Please try again.",
  "無法生成回顧，請稍後再試": "Couldn’t generate a review. Please try again.",
  "篩選條件無效": "Invalid filters",
};

export function localizeApiError(
  message: string | undefined,
  locale: Locale,
  fallback: string,
): string {
  if (!message) return fallback;
  if (locale === "zh-TW") return message;
  return API_ERROR_EN[message] ?? message;
}
