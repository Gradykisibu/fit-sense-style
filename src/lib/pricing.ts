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
  CAD: 1.36,
  EUR: 0.92,
  ZAR: 18.65,
};

export const basePlans: PricingPlan[] = [
  {
    name: "Basic",
    basePrice: 9,
    period: "/month",
    description: "Perfect for getting started with AI fashion advice",
    features: [
      "50 outfit analyses per month",
      "100 AI chat messages per month",
      "10 virtual try-ons per month",
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
      "500 AI chat messages per month",
      "50 virtual try-ons per month",
      "20 shopping reports per month",
      "Advanced style recommendations",
      "Unlimited closet storage",
      "Priority support"
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
      "1000 outfit analyses per month",
      "2000 AI chat messages per month",
      "200 virtual try-ons per month",
      "200 shopping reports per month",
      "Personal AI stylist assistant",
      "Smart Shopping Assistant",
      "Custom style analytics",
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
