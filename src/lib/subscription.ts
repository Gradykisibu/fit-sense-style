export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'pro';

export interface PlanLimits {
  monthlyAnalyses: number;
  monthlyChats: number;
  closetStorage: number | 'unlimited';
  features: string[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    monthlyAnalyses: 10,
    monthlyChats: 20,
    closetStorage: 10,
    features: ['Basic outfit analysis', 'Limited AI chat', 'Basic closet storage']
  },
  basic: {
    monthlyAnalyses: 50,
    monthlyChats: 50,
    closetStorage: 25,
    features: [
      '50 outfit analyses per month',
      '50 AI chat messages per month',
      'Basic style feedback',
      'Limited closet storage (25 items)',
      'Standard support'
    ]
  },
  premium: {
    monthlyAnalyses: 200,
    monthlyChats: 200,
    closetStorage: 'unlimited',
    features: [
      '200 outfit analyses per month',
      '200 AI chat messages per month',
      'Advanced style recommendations',
      'Unlimited closet storage',
      'Priority support',
      'Virtual Try-On Studio'
    ]
  },
  pro: {
    monthlyAnalyses: 500,
    monthlyChats: Infinity,
    closetStorage: 'unlimited',
    features: [
      '500 outfit analyses per month',
      'Unlimited AI chat messages',
      'Personal AI stylist assistant',
      'Smart Shopping Assistant',
      'Custom style analytics',
      'Priority support',
      '24/7 premium support',
      'Early access to new features'
    ]
  }
};

export function hasFeatureAccess(feature: string, userPlan: SubscriptionPlan): boolean {
  const planHierarchy: SubscriptionPlan[] = ['free', 'basic', 'premium', 'pro'];
  const userPlanIndex = planHierarchy.indexOf(userPlan);

  const featureRequirements: Record<string, number> = {
    'virtual-try-on': 2, // premium+
    'shopping-assistant': 3, // pro only
    'custom-analytics': 3, // pro only
    'unlimited-chats': 3, // pro only
    'advanced-recommendations': 2, // premium+
  };

  const requiredIndex = featureRequirements[feature];
  return requiredIndex !== undefined ? userPlanIndex >= requiredIndex : true;
}

export function getPlanBadgeColor(plan: SubscriptionPlan): string {
  const colors: Record<SubscriptionPlan, string> = {
    free: 'bg-secondary text-secondary-foreground',
    basic: 'bg-blue-500 text-white',
    premium: 'bg-primary text-primary-foreground',
    pro: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
  };
  return colors[plan];
}

export function canPerformAction(
  action: 'analysis' | 'chat',
  currentUsage: number,
  plan: SubscriptionPlan
): { allowed: boolean; message?: string } {
  const limits = PLAN_LIMITS[plan];
  const limit = action === 'analysis' ? limits.monthlyAnalyses : limits.monthlyChats;
  
  if (limit === Infinity) {
    return { allowed: true };
  }
  
  if (currentUsage >= limit) {
    return {
      allowed: false,
      message: `You've reached your ${action} limit for this month. Upgrade to continue.`
    };
  }
  
  const remaining = limit - currentUsage;
  if (remaining <= 5) {
    return {
      allowed: true,
      message: `Only ${remaining} ${action === 'analysis' ? 'analyses' : 'chats'} remaining this month.`
    };
  }
  
  return { allowed: true };
}
