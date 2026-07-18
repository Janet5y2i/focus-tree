import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  displayName: string;
  passwordHash: string;
  avatarUrl?: string;
  preferences: {
    reviewCadence: "weekly" | "biweekly" | "monthly";
    timezone: string;
    locale: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatarUrl: String,
    preferences: {
      reviewCadence: {
        type: String,
        enum: ["weekly", "biweekly", "monthly"],
        default: "weekly",
      },
      timezone: { type: String, default: "Asia/Taipei" },
      locale: { type: String, default: "zh-TW" },
    },
  },
  { timestamps: true },
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  preferences: IUser["preferences"];
  createdAt: Date;
};

export function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    preferences: user.preferences,
    createdAt: user.createdAt,
  };
}
