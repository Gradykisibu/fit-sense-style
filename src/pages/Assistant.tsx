import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getCloset, getSuggestions, createTryOnJob } from '@/lib/api';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Bot, User, Sparkles, Send } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  outfits?: any[];
  timestamp: Date;
}

export default function Assistant() {
  useDocumentTitle('AI Style Assistant');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: "Hi! I'm your AI style assistant. Tell me about an upcoming occasion and I'll help you find the perfect outfit from your closet. For example: \"I'm going to a wedding next weekend\" or \"I have a job interview tomorrow\".",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const extractOccasion = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('wedding')) return 'formal';
    if (lowerText.includes('interview') || lowerText.includes('business') || lowerText.includes('meeting')) return 'business';
    if (lowerText.includes('date') || lowerText.includes('dinner')) return 'date';
    if (lowerText.includes('funeral')) return 'formal';
    if (lowerText.includes('party') || lowerText.includes('celebration')) return 'party';
    if (lowerText.includes('casual') || lowerText.includes('everyday')) return 'casual';
    if (lowerText.includes('smart casual') || lowerText.includes('brunch')) return 'smart_casual';
    
    // Default to smart_casual for professional/semi-formal occasions
    return 'smart_casual';
  };

  const extractPalette = (text: string): string | undefined => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('neutral') || lowerText.includes('beige') || lowerText.includes('navy')) return 'neutral';
    if (lowerText.includes('warm') || lowerText.includes('red') || lowerText.includes('orange')) return 'warm';
    if (lowerText.includes('cool') || lowerText.includes('blue') || lowerText.includes('green')) return 'cool';
    if (lowerText.includes('black') || lowerText.includes('white') || lowerText.includes('grey')) return 'monochrome';
    return undefined;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check if user has items in closet first
      const closetItems = await getCloset();
      
      if (closetItems.length === 0) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'd love to help you pick an outfit! However, it looks like your closet is empty. Please add some clothing items to your closet first, then I can create personalized outfit recommendations for your occasion.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      // Extract occasion and preferences from user message
      const occasion = extractOccasion(userMessage.content);
      const palette = extractPalette(userMessage.content);

      // Get outfit suggestions
      const suggestions = await getSuggestions(occasion, palette, 3);

      let responseContent = '';
      const occasionMap: { [key: string]: string } = {
        'formal': 'formal event',
        'business': 'business occasion',
        'date': 'date',
        'party': 'party',
        'casual': 'casual outing',
        'smart_casual': 'smart casual occasion'
      };

      if (suggestions.length > 0) {
        responseContent = `Perfect! I've analyzed your closet and found some great outfit options for your ${occasionMap[occasion] || 'occasion'}. Here are my top recommendations:`;
      } else {
        responseContent = `I understand you need an outfit for your ${occasionMap[occasion] || 'occasion'}. While I couldn't find perfect matches in your current closet, here are some suggestions based on what would work well:`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        outfits: suggestions,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to get outfit suggestions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = async (outfit: any) => {
    try {
      const job = await createTryOnJob(outfit.items);
      toast({
        title: 'Try-On Started',
        description: `Job ${job.id} created. Check Try-On page for results.`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to start try-on',
        variant: 'destructive'
      });
    }
  };

  return (
    <main className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-2 rounded-full">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">AI Style Assistant</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="space-y-2">
                    <div className={`p-3 rounded-2xl ${
                      message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    {message.outfits && message.outfits.length > 0 && (
                      <div className="space-y-3">
                        {message.outfits.map((outfit) => (
                          <Card key={outfit.id} className="border-l-4 border-l-primary">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center justify-between">
                                <span>{outfit.title}</span>
                                <Button size="sm" onClick={() => handleTryOn(outfit)}>
                                  Try On
                                </Button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground mb-3">{outfit.rationale}</p>
                              <div className="flex flex-wrap gap-2">
                                {outfit.items.map((item: any) => (
                                  <span key={item.id} className="text-xs px-2 py-1 rounded-full border bg-card capitalize inline-flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: item.colorHex || '#ccc' }} />
                                    {item.category}
                                  </span>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3 rounded-2xl bg-secondary">
                  <p className="text-sm">Analyzing your closet and finding the perfect outfit...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me about your occasion... (e.g., I'm going to a wedding this weekend, I have a job interview tomorrow, etc.)"
          className="flex-1 resize-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={loading}
        />
        <Button onClick={handleSendMessage} disabled={loading || !input.trim()} size="icon" className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}