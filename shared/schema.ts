import { pgTable, text, serial, timestamp, boolean, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingId: text("booking_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  teamName: text("team_name"),
  sportType: text("sport_type").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  amount: integer("amount").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentId: text("payment_id"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockedSlots = pgTable("blocked_slots", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  sportType: text("sport_type").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
}).extend({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number"),
  email: z.string().email("Invalid email").optional(),
  sportType: z.enum(["cricket", "football", "badminton", "basketball"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  timeSlot: z.string().min(1, "Time slot is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
});

export const insertBlockedSlotSchema = createInsertSchema(blockedSlots).omit({
  id: true,
  createdAt: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type InsertBlockedSlot = z.infer<typeof insertBlockedSlotSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
