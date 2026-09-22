export type AppRole = "customer" | "end_user";

export type OrderStatus =
  | "quotation"
  | "quotation_sent"
  | "confirmed"
  | "picked_up"
  | "returned"
  | "cancelled";

export type DurationUnit = "hour" | "day" | "week" | "month" | "year";

export type DeliveryKind = "pickup" | "return";
export type DeliveryStatus = "scheduled" | "ready" | "done" | "late" | "cancelled";

export type InvoiceKind = "deposit" | "full" | "balance" | "late_fee";
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type ReservationStatus = "held" | "reserved" | "out" | "returned" | "released";

export type CustomerSegment = "retail" | "corporate" | "vip";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: AppRole;
  segment: CustomerSegment;
  city?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  blurb?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isRentable: boolean;
  totalUnits: number;
  replacementValue: number;
  depositAmount: number;
  minDurationUnit: DurationUnit;
  minDurationQty: number;
  specs: Record<string, string>;
  tags: string[];
}

export interface PricelistRule {
  id: string;
  pricelistId: string;
  productId?: string;
  categoryId?: string;
  unit: DurationUnit;
  minQty: number;
  price: number;
  discountPercent: number;
  discountFixed: number;
}

export interface Pricelist {
  id: string;
  name: string;
  segment?: CustomerSegment;
  priority: number;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  rules: PricelistRule[];
}

/** One chunk of a priced duration, e.g. "1 week at 2,400" plus "3 days at 420". */
export interface PriceChunk {
  unit: DurationUnit;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface LinePricing {
  chunks: PriceChunk[];
  gross: number;
  discount: number;
  net: number;
  pricelistId: string;
  pricelistName: string;
  /** What a flat per-day rate would have cost, so the UI can show the saving. */
  naiveDayRate?: number;
}

export interface OrderLine {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unit: DurationUnit;
  durationQty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  breakdown: PriceChunk[];
}

export interface RentalOrder {
  id: string;
  reference: string;
  customerId: string;
  status: OrderStatus;
  startsAt: string;
  endsAt: string;
  pricelistId?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  depositTotal: number;
  lateFeeTotal: number;
  total: number;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  lines: OrderLine[];
}

export interface Reservation {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
}

export interface Delivery {
  id: string;
  orderId: string;
  kind: DeliveryKind;
  documentNo: string;
  scheduledAt: string;
  completedAt?: string;
  status: DeliveryStatus;
  address?: string;
  handler?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  number: string;
  kind: InvoiceKind;
  amount: number;
  status: InvoiceStatus;
  dueDate?: string;
  issuedAt: string;
  paidAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  gateway: string;
  gatewayPaymentId?: string;
  status: string;
  paidAt: string;
}

export interface LateFeeRule {
  id: string;
  name: string;
  categoryId?: string;
  graceHours: number;
  feeType: "flat" | "per_day" | "percent_of_rental";
  amount: number;
  capAmount?: number;
  isActive: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  audience: "customer" | "end_user";
  event: "before_return" | "before_pickup" | "overdue";
  leadDays: number;
  channel: "email" | "portal";
  isActive: boolean;
}

export interface AppNotification {
  id: string;
  ruleId?: string;
  orderId: string;
  audience: "customer" | "end_user";
  channel: "email" | "portal";
  subject: string;
  body: string;
  scheduledFor: string;
  sentAt?: string;
  status: "scheduled" | "sent" | "failed" | "read";
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  startsAt: string;
  endsAt: string;
  items: CartItem[];
}
