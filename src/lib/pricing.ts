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
      "50 AI chat messages per month",
      "Basic style feedback",
      "Limited closet storage (25 items)",
      "Standard support"
    ],
    buttonText: "Get Started",
    popular: false
  },
  {
    name: "Premium",
    basePrice: 24,
    period: "/month",
    description: "Most popular choice for fashion enthusiasts",
    features: [
      "200 outfit analyses per month",
      "200 AI chat messages per month",
      "Advanced style recommendations",
      "Unlimited closet storage",
      "Priority support",
      "Seasonal trend reports"
    ],
    buttonText: "Go Premium",
    popular: true
  },
  {
    name: "Pro",
    basePrice: 49,
    period: "/month",
    description: "Complete solution for style professionals and influencers",
    features: [
      "500 outfit analyses per month",
      "Unlimited AI chat messages",
      "Personal AI stylist assistant",
      "Custom style analytics",
      "Priority support",
      "24/7 premium support",
      "Early access to new features"
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
