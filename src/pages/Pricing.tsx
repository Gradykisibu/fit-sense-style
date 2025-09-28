import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";

const Pricing = () => {
  useDocumentTitle("Pricing – FitSense");

  const plans = [
    {
      name: "Basic",
      price: "$9",
      period: "/month",
      description: "Perfect for getting started with AI fashion advice",
      icon: <Star className="h-6 w-6" />,
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
      price: "$19",
      period: "/month",
      description: "Most popular choice for fashion enthusiasts",
      icon: <Crown className="h-6 w-6" />,
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
      price: "$39",
      period: "/month",
      description: "Complete solution for style professionals and influencers",
      icon: <Zap className="h-6 w-6" />,
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

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Choose Your Style Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Unlock the power of AI-driven fashion advice and transform your style journey
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative transition-all duration-300 hover:shadow-lg ${
              plan.popular ? 'border-primary shadow-lg scale-105' : 'hover:scale-102'
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className={`p-3 rounded-full ${
                  plan.popular ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                }`}>
                  {plan.icon}
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="text-sm">{plan.description}</CardDescription>
              <div className="flex items-baseline justify-center mt-4">
                <span className="text-4xl font-bold text-primary">{plan.price}</span>
                <span className="text-muted-foreground ml-1">{plan.period}</span>
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button 
                className="w-full" 
                variant={plan.popular ? "default" : "outline"}
                size="lg"
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          All plans include
        </h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            "AI-powered outfit analysis",
            "Style trend insights",
            "Mobile app access",
            "Secure data protection"
          ].map((feature, index) => (
            <div key={index} className="text-center">
              <div className="bg-accent rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Check className="h-6 w-6 text-accent-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{feature}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4">
          Have questions about our plans?
        </p>
        <Button variant="ghost">
          Contact Support
        </Button>
      </div>
    </main>
  );
};

export default Pricing;