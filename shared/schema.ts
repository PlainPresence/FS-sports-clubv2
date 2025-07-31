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
  captainName: text("captain_name"),
  captainMobile: text("captain_mobile"),
  captainEmail: text("captain_email"),
  teamMembers: text("team_members"), // JSON string for tournament bookings
  sportType: text("sport_type").notNull(),
  facilityType: text("facility_type"), // For consistency with frontend
  date: text("date").notNull(),
  timeSlot: text("time_slot"), // Single slot (backward compatibility)
  timeSlots: text("time_slots"), // JSON string for multiple slots
  amount: integer("amount").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentId: text("payment_id"),
  cashfreeOrderId: text("cashfree_order_id"),
  cashfreePaymentId: text("cashfree_payment_id"),
  cashfreePaymentStatus: text("cashfree_payment_status"),
  // Tournament specific fields
  tournamentId: text("tournament_id"),
  tournamentName: text("tournament_name"),
  // Cricket specific fields
  speedMeter: boolean("speed_meter").default(false),
  speedMeterPrice: integer("speed_meter_price").default(0),
  // Additional metadata
  bookingType: text("booking_type").default("regular"), // "regular" or "tournament"
  status: text("status").default("confirmed"), // "confirmed", "cancelled", "completed"
  notes: text("notes"), // Additional notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// New collection for real-time slot tracking
export const slotAvailability = pgTable("slot_availability", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  sportType: text("sport_type").notNull(),
  timeSlot: text("time_slot").notNull(),
  status: text("status").notNull().default("available"), // "available", "booked", "blocked"
  bookingId: text("booking_id"), // Reference to booking if booked
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number"),
  email: z.string().email("Invalid email").optional(),
  sportType: z.enum(["cricket", "football", "badminton", "basketball", "airhockey", "snooker", "pool"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  timeSlots: z.array(z.string()).min(1, "At least one time slot is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  bookingType: z.enum(["regular", "tournament"]).default("regular"),
  status: z.enum(["confirmed", "cancelled", "completed"]).default("confirmed"),
});

export const insertBlockedSlotSchema = createInsertSchema(blockedSlots).omit({
  id: true,
  createdAt: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
});

export const insertSlotAvailabilitySchema = createInsertSchema(slotAvailability).omit({
  id: true,
  lastUpdated: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type InsertBlockedSlot = z.infer<typeof insertBlockedSlotSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type SlotAvailability = typeof slotAvailability.$inferSelect;
export type InsertSlotAvailability = z.infer<typeof insertSlotAvailabilitySchema>;
