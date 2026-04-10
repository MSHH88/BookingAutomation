/**
 * Memberships service — Phase 5.2
 *
 * Business logic for recurring memberships.
 *
 * ── What this module does ───────────────────────────────────────────────────
 *
 *  createMembership(tenantId, body)
 *    Creates a new membership plan definition.
 *
 *  listMemberships(tenantId, query)
 *    Paginated list of membership plans.
 *
 *  getMembershipById(id, tenantId)
 *    Fetch single plan, tenant-scoped.
 *
 *  updateMembership(id, tenantId, body)
 *    Update a membership plan.
 *
 *  deleteMembership(id, tenantId)
 *    Soft-delete (sets isActive = false).
 *
 *  subscribeMember(membershipId, body, tenantId)
 *    Creates a CustomerMembership (Stripe Subscription creation is handled
 *    by the Stripe checkout flow separately; this records the association).
 *
 *  cancelSubscription(customerMembershipId, tenantId)
 *    Marks CustomerMembership as CANCELLED.
 *
 *  listCustomerMemberships(customerId, tenantId, query)
 *    Paginated list of memberships for a customer.
 *
 *  handleSubscriptionWebhook(event, tenantId?)
 *    Handles Stripe subscription lifecycle events:
 *      invoice.paid                    → ensure status = ACTIVE
 *      invoice.payment_failed          → set status = PAST_DUE
 *      customer.subscription.deleted   → set status = CANCELLED
 *
 *  hasActiveMembership(customerId, tenantId, serviceId?)
 *    Returns true if the customer has an ACTIVE membership that covers the
 *    given service (or any service when serviceId is omitted).
 */
import type Stripe from 'stripe';
import { Prisma, MembershipStatus } from '@prisma/client';

import { prisma }                    from '../../lib/prisma';
import { AppError }                  from '../../errors/AppError';
import { paginate, PaginatedResult } from '../../utils/paginate';
import { logger }                    from '../../utils/logger';
import type {
  CreateMembershipBody,
  UpdateMembershipBody,
  ListMembershipsQuery,
  SubscribeBody,
  ListCustomerMembershipsQuery,
} from './memberships.schema';

// ─── Prisma select shapes ─────────────────────────────────────────────────────

const membershipSelect = {
  id:               true,
  tenantId:         true,
  name:             true,
  price:            true,
  billingInterval:  true,
  includedServices: true,
  usageLimit:       true,
  isActive:         true,
  createdAt:        true,
  updatedAt:        true,
} satisfies Prisma.MembershipSelect;

const customerMembershipSelect = {
  id:                   true,
  customerId:           true,
  membershipId:         true,
  tenantId:             true,
  stripeSubscriptionId: true,
  status:               true,
  currentPeriodEnd:     true,
  createdAt:            true,
  updatedAt:            true,
  membership: {
    select: {
      id:               true,
      name:             true,
      billingInterval:  true,
      includedServices: true,
      usageLimit:       true,
    },
  },
} satisfies Prisma.CustomerMembershipSelect;

// ─── Inferred return types ────────────────────────────────────────────────────

export type MembershipDetail         = Prisma.MembershipGetPayload<{ select: typeof membershipSelect }>;
export type CustomerMembershipDetail = Prisma.CustomerMembershipGetPayload<{ select: typeof customerMembershipSelect }>;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createMembership(
  tenantId: string,
  body:     CreateMembershipBody,
): Promise<MembershipDetail> {
  const membership = await prisma.membership.create({
    data: {
      tenantId,
      name:             body.name,
      price:            body.price,
      billingInterval:  body.billingInterval,
      includedServices: body.includedServices as unknown as Prisma.InputJsonValue,
      usageLimit:       body.usageLimit ?? null,
      isActive:         body.isActive,
    },
    select: membershipSelect,
  });

  logger.info('Membership plan created', { membershipId: membership.id, tenantId });
  return membership;
}

export async function listMemberships(
  tenantId: string,
  query:    ListMembershipsQuery,
): Promise<PaginatedResult<MembershipDetail>> {
  const where: Prisma.MembershipWhereInput = { tenantId };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true';
  }

  return paginate<MembershipDetail>(
    prisma.membership,
    { where, select: membershipSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

export async function getMembershipById(
  id:       string,
  tenantId: string,
): Promise<MembershipDetail> {
  const membership = await prisma.membership.findUnique({
    where:  { id },
    select: membershipSelect,
  });

  if (!membership) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Membership plan '${id}' not found`);
  }

  if (membership.tenantId !== tenantId) {
    throw new AppError(403, 'MEMBERSHIP_FORBIDDEN', 'Membership plan does not belong to your tenant');
  }

  return membership;
}

export async function updateMembership(
  id:       string,
  tenantId: string,
  body:     UpdateMembershipBody,
): Promise<MembershipDetail> {
  const existing = await prisma.membership.findUnique({
    where:  { id },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Membership plan '${id}' not found`);
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'MEMBERSHIP_FORBIDDEN', 'Membership plan does not belong to your tenant');
  }

  const updated = await prisma.membership.update({
    where: { id },
    data:  {
      ...(body.name             !== undefined && { name:             body.name }),
      ...(body.price            !== undefined && { price:            body.price }),
      ...(body.billingInterval  !== undefined && { billingInterval:  body.billingInterval }),
      ...(body.includedServices !== undefined && { includedServices: body.includedServices as unknown as Prisma.InputJsonValue }),
      ...(body.usageLimit       !== undefined && { usageLimit:       body.usageLimit }),
      ...(body.isActive         !== undefined && { isActive:         body.isActive }),
    },
    select: membershipSelect,
  });

  logger.info('Membership plan updated', { membershipId: id, tenantId });
  return updated;
}

export async function deleteMembership(
  id:       string,
  tenantId: string,
): Promise<MembershipDetail> {
  const existing = await prisma.membership.findUnique({
    where:  { id },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Membership plan '${id}' not found`);
  }

  if (existing.tenantId !== tenantId) {
    throw new AppError(403, 'MEMBERSHIP_FORBIDDEN', 'Membership plan does not belong to your tenant');
  }

  const deleted = await prisma.membership.update({
    where:  { id },
    data:   { isActive: false },
    select: membershipSelect,
  });

  logger.info('Membership plan soft-deleted', { membershipId: id, tenantId });
  return deleted;
}

/**
 * Subscribe a customer to a membership plan.
 * Note: Actual Stripe Subscription creation is done by the payments/checkout
 * flow. This function records the CustomerMembership association in the DB.
 */
export async function subscribeMember(
  membershipId: string,
  body:         SubscribeBody,
  tenantId:     string,
): Promise<CustomerMembershipDetail> {
  const membership = await prisma.membership.findUnique({
    where:  { id: membershipId },
    select: { id: true, tenantId: true, isActive: true },
  });

  if (!membership) {
    throw new AppError(404, 'MEMBERSHIP_NOT_FOUND', `Membership plan '${membershipId}' not found`);
  }

  if (membership.tenantId !== tenantId) {
    throw new AppError(403, 'MEMBERSHIP_FORBIDDEN', 'Membership plan does not belong to your tenant');
  }

  if (!membership.isActive) {
    throw new AppError(400, 'MEMBERSHIP_INACTIVE', 'This membership plan is no longer available');
  }

  const customer = await prisma.user.findUnique({
    where:  { id: body.customerId },
    select: { id: true, tenantId: true },
  });

  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', `Customer '${body.customerId}' not found`);
  }

  if (customer.tenantId !== tenantId) {
    throw new AppError(403, 'CUSTOMER_FORBIDDEN', 'Customer does not belong to your tenant');
  }

  // Check for duplicate active membership
  const existing = await prisma.customerMembership.findFirst({
    where: { customerId: body.customerId, membershipId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      409,
      'MEMBERSHIP_ALREADY_ACTIVE',
      'Customer already has an active subscription to this membership plan',
    );
  }

  const customerMembership = await prisma.customerMembership.create({
    data: {
      customerId:   body.customerId,
      membershipId,
      tenantId,
      status:       'ACTIVE',
    },
    select: customerMembershipSelect,
  });

  logger.info('Customer subscribed to membership', {
    customerMembershipId: customerMembership.id,
    customerId:           body.customerId,
    membershipId,
    tenantId,
  });

  return customerMembership;
}

/**
 * Cancel a CustomerMembership.
 */
export async function cancelSubscription(
  customerMembershipId: string,
  tenantId:             string,
): Promise<CustomerMembershipDetail> {
  const cm = await prisma.customerMembership.findUnique({
    where:  { id: customerMembershipId },
    select: { id: true, tenantId: true, status: true },
  });

  if (!cm) {
    throw new AppError(404, 'CUSTOMER_MEMBERSHIP_NOT_FOUND', `Customer membership '${customerMembershipId}' not found`);
  }

  if (cm.tenantId !== tenantId) {
    throw new AppError(403, 'MEMBERSHIP_FORBIDDEN', 'Customer membership does not belong to your tenant');
  }

  if (cm.status === 'CANCELLED') {
    throw new AppError(409, 'MEMBERSHIP_ALREADY_CANCELLED', 'Membership is already cancelled');
  }

  const updated = await prisma.customerMembership.update({
    where:  { id: customerMembershipId },
    data:   { status: 'CANCELLED' as MembershipStatus },
    select: customerMembershipSelect,
  });

  logger.info('Customer membership cancelled', { customerMembershipId, tenantId });
  return updated;
}

/**
 * List CustomerMemberships for a specific customer (ADMIN view).
 */
export async function listCustomerMemberships(
  customerId: string,
  tenantId:   string,
  query:      ListCustomerMembershipsQuery,
): Promise<PaginatedResult<CustomerMembershipDetail>> {
  const where: Prisma.CustomerMembershipWhereInput = { customerId, tenantId };

  return paginate<CustomerMembershipDetail>(
    prisma.customerMembership,
    { where, select: customerMembershipSelect, orderBy: { createdAt: 'desc' } },
    { page: query.page, limit: query.limit },
  );
}

/**
 * Returns true if a customer has an ACTIVE membership covering the given
 * serviceId (or any service when serviceId is not provided).
 * Used by bookings.service to skip/discount payment for covered services.
 */
export async function hasActiveMembership(
  customerId: string,
  tenantId:   string,
  serviceId?: string,
): Promise<boolean> {
  const activeMemberships = await prisma.customerMembership.findMany({
    where: { customerId, tenantId, status: 'ACTIVE' },
    select: {
      membership: { select: { includedServices: true } },
    },
  });

  if (activeMemberships.length === 0) return false;

  if (!serviceId) return true; // any active membership suffices

  for (const cm of activeMemberships) {
    const services = cm.membership.includedServices as string[];
    // Empty array means all services are covered
    if (services.length === 0 || services.includes(serviceId)) return true;
  }

  return false;
}

/**
 * Handle Stripe subscription webhook events.
 * Called from payments.service.handleWebhookEvent.
 */
export async function handleSubscriptionWebhook(
  eventType: string,
  object:    Stripe.Subscription | Stripe.Invoice,
): Promise<void> {
  switch (eventType) {
    case 'invoice.paid': {
      const invoice    = object as Stripe.Invoice;
      const subId      = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
      if (!subId) return;
      await prisma.customerMembership.updateMany({
        where: { stripeSubscriptionId: subId },
        data:  {
          status:          'ACTIVE' as MembershipStatus,
          currentPeriodEnd: invoice.lines?.data?.[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000)
            : undefined,
        },
      });
      logger.info('Membership marked ACTIVE via invoice.paid', { subscriptionId: subId });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = object as Stripe.Invoice;
      const subId   = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
      if (!subId) return;
      await prisma.customerMembership.updateMany({
        where: { stripeSubscriptionId: subId },
        data:  { status: 'PAST_DUE' as MembershipStatus },
      });
      logger.info('Membership marked PAST_DUE via invoice.payment_failed', { subscriptionId: subId });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = object as Stripe.Subscription;
      await prisma.customerMembership.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data:  { status: 'CANCELLED' as MembershipStatus },
      });
      logger.info('Membership marked CANCELLED via customer.subscription.deleted', { subscriptionId: sub.id });
      break;
    }

    default:
      logger.debug('Unhandled subscription webhook event', { eventType });
  }
}
