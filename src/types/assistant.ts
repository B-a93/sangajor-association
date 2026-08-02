export type AssistantCitation = { label: string; href: string };

export type AssistantReply = {
  answer: string;
  citations: AssistantCitation[];
  suggestedActions: string[];
  conversationId: string;
  intent: AssistantIntent;
};

export type AssistantIntent = 'events' | 'dues' | 'announcements' | 'volunteering' | 'leadership' | 'help';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AssistantCitation[];
};

export type AutomationPreference = {
  event_reminders: boolean;
  dues_reminders: boolean;
  announcement_digest: boolean;
  volunteer_matches: boolean;
};
