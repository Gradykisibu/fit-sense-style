import countries from '@/data/countries.json';

export interface PricingPlan {
  name: string;
  basePrice: number; // Base price in USD
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
}

// Currency conversion rates (relative to USD)
const currencyRates: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  INR: 83.12,
  JPY: 149.50,
  CNY: 7.24,
  BRL: 4.97,
  MXN: 17.15,
  ZAR: 18.65,
  NGN: 1505.50,
  KES: 129.50,
  SGD: 1.34,
  AED: 3.67,
};

export const basePlans: PricingPlan[] = [
  {
    name: "Basic",
    basePrice: 9,
    period: "/month",
    description: "Perfect for getting started with AI fashion advice",
    features: [
      "50 outfit analyses per month",
      "Basic style feedback",
      "Limited closet storage (25 items)",
      "Standard support",
      "Mobile app access"
    ],
    buttonText: "Get Started",
    popular: false
  },
  {
    name: "Premium",
    basePrice: 19,
    period: "/month",
    description: "Most popular choice for fashion enthusiasts",
    features: [
      "Unlimited outfit analyses",
      "Advanced style recommendations",
      "Unlimited closet storage",
      "Mix & match suggestions",
      "Priority support",
      "Seasonal trend reports",
      "Virtual try-on (10 per month)"
    ],
    buttonText: "Go Premium",
    popular: true
  },
  {
    name: "Pro",
    basePrice: 39,
    period: "/month",
    description: "Complete solution for style professionals and influencers",
    features: [
      "Everything in Premium",
      "Unlimited virtual try-ons",
      "Personal AI stylist assistant",
      "Brand partnership opportunities",
      "Custom style analytics",
      "White-label solutions",
      "24/7 premium support",
      "API access for integrations"
    ],
    buttonText: "Go Pro",
    popular: false
  }
];

export function convertPrice(basePrice: number, targetCurrency: string): number {
  const rate = currencyRates[targetCurrency] || 1;
  return Math.round(basePrice * rate);
}

export function getCurrencySymbol(countryCode: string): string {
  const country = countries.find(c => c.code === countryCode);
  return country?.currencySymbol || '$';
}

export function getCurrency(countryCode: string): string {
  const country = countries.find(c => c.code === countryCode);
  return country?.currency || 'USD';
}

export function formatPrice(price: number, currencySymbol: string): string {
  return `${currencySymbol}${price}`;
}
