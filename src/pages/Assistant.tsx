import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Bot, User, Sparkles, Send, Image as ImageIcon, Plus, History, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { canPerformAction } from '@/lib/subscription';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Assistant() {
  useDocumentTitle('AI Style Assistant');
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    fetchUserUsage();
  }, []);

  const fetchUserUsage = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('subscription_plan, monthly_chats_used')
      .eq('id', user.id)
      .single();
    if (data) {
      setUserPlan(data.subscription_plan || 'free');
      setUsageInfo(data);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const loadConversation = async (conversationId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          image_url: msg.image_url,
          timestamp: new Date(msg.created_at),
        }))
      );
      setCurrentConversationId(conversationId);
    }
    setLoading(false);
  };

  const createNewConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user?.id,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentConversationId(data.id);
      setMessages([]);
      loadConversations();
      return data.id;
    }
    return null;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('closet-items')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('closet-items').getPublicUrl(fileName);

      setSelectedImage(publicUrl);
      toast({
        title: 'Image uploaded',
        description: 'Image ready to analyze',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string, imageUrl?: string) => {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user?.id,
      role,
      content,
      image_url: imageUrl,
    });

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the conversation when clicking delete
    
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (!error) {
      // If we're deleting the current conversation, clear it
      if (conversationId === currentConversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      
      loadConversations();
      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    // Check usage limits
    const usageCheck = canPerformAction('chat', usageInfo?.monthly_chats_used || 0, userPlan as any);
    if (!usageCheck.allowed) {
      toast({
        title: 'Limit Reached',
        description: usageCheck.message,
        variant: 'destructive'
      });
      return;
    }
    
    if (usageCheck.message) {
      toast({ title: 'Usage Warning', description: usageCheck.message });
    }

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || '(Analyzing image)',
      image_url: selectedImage || undefined,
      timestamp: new Date(),
    };

    // Detect if user is requesting an outfit image
    const inputLc = input.toLowerCase();
    const isExplicitVisualRequest =
      /visual|image|picture|photo|render|flat lay/.test(inputLc) ||
      /(show|see|send|display).*(visual|image|picture|photo|outfit)/.test(inputLc);
    const isAffirmative = /(yes|sure|yeah|yep|please do|ok|okay)/.test(inputLc);

    const lastAssistantMessage = messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
      ? messages[messages.length - 1].content.toLowerCase()
      : '';

    const isOfferToGenerateImage = lastAssistantMessage.includes('would you like') && 
                                    (lastAssistantMessage.includes('visual') || 
                                     lastAssistantMessage.includes('image') ||
                                     lastAssistantMessage.includes('see'));

    const shouldGenerateImage = isExplicitVisualRequest || (isAffirmative && isOfferToGenerateImage);
    setMessages((prev) => [...prev, userMessage]);
    await saveMessage(conversationId, 'user', userMessage.content, userMessage.image_url);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if we should generate an image instead of regular chat
      if (shouldGenerateImage) {
        // Generate outfit image
        const imageResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: messages.concat([userMessage]).map((m) => ({
              role: m.role,
              content: m.content,
              image_url: m.image_url,
            })),
            conversationId,
            generateImage: true,
          }),
        });

        if (imageResponse.ok) {
          const { imageUrl } = await imageResponse.json();
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "Here's a visual representation of the suggested outfit:",
            image_url: imageUrl,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          await saveMessage(conversationId, 'assistant', assistantMessage.content, assistantMessage.image_url);
          loadConversations();
        } else {
          throw new Error('Failed to generate image');
        }
        
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: messages.concat([userMessage]).map((m) => ({
            role: m.role,
            content: m.content,
            image_url: m.image_url,
          })),
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId = (Date.now() + 1).toString();

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  assistantContent += delta;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                    )
                  );
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save final assistant message
      await saveMessage(conversationId, 'assistant', assistantContent);
      
      // Update usage count
      await supabase
        .from('profiles')
        .update({ monthly_chats_used: (usageInfo?.monthly_chats_used || 0) + 1 })
        .eq('id', user?.id!);
      
      fetchUserUsage();
      loadConversations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isPro = userPlan === 'pro';

  return (
    <main className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              AI Style Assistant
              {isPro && <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">Pro</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isPro ? 'Unlimited personalized style advice' : 'Get personalized style advice'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Conversation History</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center gap-2 group"
                  >
                    <Button
                      variant={conv.id === currentConversationId ? 'secondary' : 'ghost'}
                      className="flex-1 justify-start"
                      onClick={() => loadConversation(conv.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{conv.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => deleteConversation(conv.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={createNewConversation} size="sm">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
      </div>

      <Card className="mb-6 h-[calc(100vh-300px)]">
        <CardContent className="p-4 h-full overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-4 max-w-md">
                <div className="bg-primary/10 p-4 rounded-full inline-block">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Your Personal Fashion AI</h2>
                <p className="text-muted-foreground">
                  I learn your style preferences, analyze outfit photos, and recommend perfect combinations from your closet. Upload an image or describe your occasion!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}
                    >
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className="space-y-2">
                      {message.image_url && (
                        <img
                          src={message.image_url}
                          alt="Uploaded"
                          className="rounded-lg max-w-sm border"
                        />
                      )}
                      <div
                        className={`p-3 rounded-2xl ${
                          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
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
                    <p className="text-sm">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {selectedImage && (
          <div className="relative inline-block">
            <img src={selectedImage} alt="Selected" className="h-20 rounded-lg border" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploadingImage}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your occasion or ask for style advice... (e.g., 'I have a wedding this weekend' or 'What should I wear for a job interview?')"
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
          <Button
            onClick={handleSendMessage}
            disabled={loading || (!input.trim() && !selectedImage)}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}