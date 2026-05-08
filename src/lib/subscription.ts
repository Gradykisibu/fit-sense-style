export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'pro';

export interface PlanLimits {
  monthlyAnalyses: number;
  monthlyChats: number;
  monthlyTryons: number;
  monthlyShopping: number;
  closetStorage: number | 'unlimited';
  features: string[];
}

// MUST mirror PLAN_LIMITS in supabase/functions/_shared/usage.ts
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    monthlyAnalyses: 5,
    monthlyChats: 10,
    monthlyTryons: 1,
    monthlyShopping: 0,
    closetStorage: 10,
    features: ['Basic outfit analysis', 'Limited AI chat', 'Basic closet storage'],
  },
  basic: {
    monthlyAnalyses: 50,
    monthlyChats: 100,
    monthlyTryons: 10,
    monthlyShopping: 0,
    closetStorage: 25,
    features: [
      '50 outfit analyses per month',
      '100 AI chat messages per month',
      '10 virtual try-ons per month',
      'Basic style feedback',
      'Limited closet storage (25 items)',
      'Standard support',
    ],
  },
  premium: {
    monthlyAnalyses: 200,
    monthlyChats: 500,
    monthlyTryons: 50,
    monthlyShopping: 20,
    closetStorage: 'unlimited',
    features: [
      '200 outfit analyses per month',
      '500 AI chat messages per month',
      '50 virtual try-ons per month',
      '20 shopping reports per month',
      'Advanced style recommendations',
      'Unlimited closet storage',
      'Priority support',
    ],
  },
  pro: {
    monthlyAnalyses: 1000,
    monthlyChats: 2000,
    monthlyTryons: 200,
    monthlyShopping: 200,
    closetStorage: 'unlimited',
    features: [
      '1000 outfit analyses per month',
      '2000 AI chat messages per month',
      '200 virtual try-ons per month',
      '200 shopping reports per month',
      'Personal AI stylist assistant',
      'Smart Shopping Assistant',
      'Custom style analytics',
      '24/7 premium support',
      'Early access to new features',
    ],
  },
};

export function hasFeatureAccess(feature: string, userPlan: SubscriptionPlan): boolean {
  const planHierarchy: SubscriptionPlan[] = ['free', 'basic', 'premium', 'pro'];
  const userPlanIndex = planHierarchy.indexOf(userPlan);

  const featureRequirements: Record<string, number> = {
    'virtual-try-on': 1,
    'shopping-assistant': 2,
    'custom-analytics': 3,
    'unlimited-chats': 3,
    'advanced-recommendations': 2,
  };

  const requiredIndex = featureRequirements[feature];
  return requiredIndex !== undefined ? userPlanIndex >= requiredIndex : true;
}

export function getPlanBadgeColor(plan: SubscriptionPlan): string {
  const colors: Record<SubscriptionPlan, string> = {
    free: 'bg-secondary text-secondary-foreground',
    basic: 'bg-blue-500 text-white',
    premium: 'bg-primary text-primary-foreground',
    pro: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  };
  return colors[plan];
}

export type UsageAction = 'analysis' | 'chat' | 'tryon' | 'shopping';

export function canPerformAction(
  action: UsageAction,
  currentUsage: number,
  plan: SubscriptionPlan,
): { allowed: boolean; message?: string; remaining?: number } {
  const limits = PLAN_LIMITS[plan];
  const limit =
    action === 'analysis' ? limits.monthlyAnalyses
    : action === 'chat' ? limits.monthlyChats
    : action === 'tryon' ? limits.monthlyTryons
    : limits.monthlyShopping;

  if (limit <= 0) {
    return { allowed: false, message: `Your ${plan} plan does not include this feature. Upgrade to continue.` };
  }
  if (currentUsage >= limit) {
    return { allowed: false, message: `You've reached your ${action} limit for this month. Upgrade to continue.` };
  }
  const remaining = limit - currentUsage;
  if (remaining <= 5) {
    return { allowed: true, remaining, message: `Only ${remaining} ${action}s remaining this month.` };
  }
  return { allowed: true, remaining };
}

/** Translate a structured edge function error envelope into a user-friendly message. */
export function describeApiError(err: any): string {
  const e = err?.error ?? err;
  if (!e) return 'Something went wrong. Please try again.';
  switch (e.code) {
    case 'unauthorized': return 'Please sign in again.';
    case 'rate_limited': return 'Too many requests. Please wait a moment and try again.';
    case 'limit_reached': return e.message ?? 'Monthly limit reached. Upgrade to continue.';
    case 'forbidden': return e.message ?? 'This feature is not available on your plan.';
    case 'country_blocked': return 'FitSense Style is not yet available in your country.';
    case 'account_blocked': return 'Your account is not active. Please contact support.';
    case 'bad_request': return e.message ?? 'Invalid request.';
    default: return e.message ?? 'Something went wrong. Please try again.';
  }
}
