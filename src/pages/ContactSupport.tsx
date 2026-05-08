import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendSupportMessage } from '@/lib/api';
import { Loader2, Mail } from 'lucide-react';

const CATEGORIES = [
  'Account',
  'Billing',
  'Subscription',
  'Closet uploads',
  'AI results',
  'Bug report',
  'Other',
];

const SUPPORT_EMAIL = 'Kisibugrady3980@gmail.com';

function openEmailFallback(category: string, subject: string, message: string, replyEmail: string) {
  const body = [
    `Category: ${category}`,
    replyEmail ? `Reply email: ${replyEmail}` : '',
    '',
    message,
  ].filter(Boolean).join('\n');
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[FitSense Support] ${subject}`)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

export default function ContactSupport() {
  const { toast } = useToast();
  const [category, setCategory] = useState('Account');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please add a subject and message before sending.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      await sendSupportMessage({
        category,
        subject: subject.trim(),
        message: message.trim(),
        replyEmail: replyEmail.trim() || undefined,
      });
      toast({
        title: 'Support message sent',
        description: `Your message was sent to ${SUPPORT_EMAIL}.`,
      });
      setSubject('');
      setMessage('');
      setReplyEmail('');
      setCategory('Account');
    } catch (error: any) {
      toast({
        title: 'Could not send message',
        description: `${error?.message || 'Please try again.'} Opening your email app as a fallback.`,
        variant: 'destructive',
      });
      openEmailFallback(category, subject.trim(), message.trim(), replyEmail.trim());
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-xl font-bold sm:text-2xl">Contact Support</h1>
        <p className="text-sm text-muted-foreground">
          Send a support request directly to the FitSense team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Support Request
          </CardTitle>
          <CardDescription>
            Messages are delivered to {SUPPORT_EMAIL}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="replyEmail">Reply email</Label>
              <Input
                id="replyEmail"
                type="email"
                placeholder="you@example.com"
                value={replyEmail}
                onChange={(event) => setReplyEmail(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What can we help with?"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={140}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe what happened, what you expected, and any steps to reproduce it."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-40 resize-y"
                maxLength={4000}
                required
              />
              <p className="text-xs text-muted-foreground">{message.length}/4000 characters</p>
            </div>

            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
