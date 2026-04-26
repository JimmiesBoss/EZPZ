export type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CLARIFYING"
  | "SEARCHING"
  | "CURATED"
  | "AWAITING_REVIEW"
  | "APPROVED"
  | "ACQUIRING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

const ALLOWED_REQUEST: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ["SUBMITTED", "REJECTED", "CANCELLED"],
  SUBMITTED: ["CLARIFYING", "SEARCHING", "REJECTED", "CANCELLED"],
  CLARIFYING: ["SEARCHING", "CLARIFYING", "REJECTED", "CANCELLED"],
  SEARCHING: ["CURATED", "CANCELLED"],
  CURATED: ["AWAITING_REVIEW", "SEARCHING", "CANCELLED"],
  AWAITING_REVIEW: ["APPROVED", "SEARCHING", "CANCELLED"],
  APPROVED: ["ACQUIRING", "CANCELLED"],
  ACQUIRING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_REQUEST[from]?.includes(to) ?? false;
}

export type FulfillmentStatus =
  | "PENDING"
  | "PURCHASED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

const ALLOWED_FULFILLMENT: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ["PURCHASED", "CANCELLED"],
  PURCHASED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransitionFulfillment(
  from: FulfillmentStatus,
  to: FulfillmentStatus
): boolean {
  return ALLOWED_FULFILLMENT[from]?.includes(to) ?? false;
}

export type EscrowState =
  | "HELD"
  | "BUYER_VERIFIED"
  | "SELLER_PAID"
  | "DISPUTED"
  | "REFUNDED";

const ALLOWED_ESCROW: Record<EscrowState, EscrowState[]> = {
  HELD: ["BUYER_VERIFIED", "DISPUTED"],
  BUYER_VERIFIED: ["SELLER_PAID"],
  SELLER_PAID: [],
  DISPUTED: ["REFUNDED", "BUYER_VERIFIED"],
  REFUNDED: [],
};

export function canTransitionEscrow(from: EscrowState, to: EscrowState): boolean {
  return ALLOWED_ESCROW[from]?.includes(to) ?? false;
}
