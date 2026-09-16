/**
 * Subscription & Plan Enforcement Middleware
 * Checks user's plan limits and enforces feature access
 */

import { Request, Response, NextFunction } from 'express';
import { getSessionUser } from './auth';
import { getPlan, canUserAuditMore, canUserAddBusiness, canUserMonitorWebsite } from './plans';
import { getUserActiveSubscription } from './paymentStore';
import { SubscriptionTier, User } from '../src/types';

export interface AuthenticatedRequest extends Request {
  /** The authenticated user. Resolved by requireAuth before handlers run. */
  user?: User | null;
}

/**
 * Middleware: Verify user is authenticated
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  req.user = user;
  next();
}

/**
 * Middleware: Verify user has an active subscription
 */
export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (user.subscription.status !== 'active') {
    return res.status(403).json({
      error: 'Your subscription is not active. Please update your billing information.',
    });
  }

  req.user = user;
  next();
}

/**
 * Middleware: Check if user can perform an audit
 */
export async function checkAuditLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = await getSessionUser(req);

  // Guests may run a free preview crawl; the results are held until they sign up.
  if (!user) {
    return next();
  }

  const plan = getPlan(user.subscription.plan);
  const auditCount = user.usage.auditsUsed || 0;

  if (!canUserAuditMore(auditCount, plan)) {
    return res.status(403).json({
      error: `You have reached your monthly audit limit for the ${plan.name} plan.`,
      limit: plan.limits.monthlyAudits,
      current: auditCount,
      suggestion: `Upgrade to ${plan.id === 'free' ? 'Growth' : 'Agency'} for more audits.`,
    });
  }

  req.user = user;
  next();
}

/**
 * Middleware: Check if user can add a new business
 */
export async function checkBusinessLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const plan = getPlan(user.subscription.plan);
  const businessCount = user.businessIds?.length || 0;

  if (!canUserAddBusiness(businessCount, plan)) {
    return res.status(403).json({
      error: `You have reached the business limit for the ${plan.name} plan.`,
      limit: plan.limits.businessesManaged,
      current: businessCount,
      suggestion: `Upgrade to ${plan.id === 'free' ? 'Growth' : 'Agency'} to manage more businesses.`,
    });
  }

  req.user = user;
  next();
}

/**
 * Middleware: Verify user has access to a paid feature
 */
export function requirePaidPlan(
  requiredPlans: SubscriptionTier[]
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!requiredPlans.includes(user.subscription.plan)) {
      return res.status(403).json({
        error: 'This feature requires a paid plan.',
        currentPlan: user.subscription.plan,
        requiredPlans: requiredPlans,
      });
    }

    req.user = user;
    next();
  };
}

/**
 * Check plan features
 */
export function getPlanFeatureAccess(plan: SubscriptionTier) {
  const planConfig = getPlan(plan);

  return {
    canMonitorWebsites: planConfig.limits.websitesMonitored > 0,
    canManageClients: planConfig.limits.clientManagement,
    canGenerateReports: planConfig.limits.clientReports,
    hasPrioritySupport: planConfig.limits.prioritySupport,
    monitoringFrequency: planConfig.limits.monitoringFrequency,
    maxWebsites: planConfig.limits.websitesMonitored,
    maxBusinesses: planConfig.limits.businessesManaged,
    maxMonthlyAudits: planConfig.limits.monthlyAudits,
  };
}

/**
 * Log plan limit checks for debugging
 */
export function logPlanCheck(
  userId: string,
  plan: SubscriptionTier,
  checkType: string,
  allowed: boolean
) {
  const action = allowed ? 'ALLOWED' : 'BLOCKED';
  console.log(`[Plan Check] ${action} - User: ${userId}, Plan: ${plan}, Check: ${checkType}`);
}
