import { useState, useEffect } from 'react';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Box from '@cloudscape-design/components/box';
import ButtonGroup from '@cloudscape-design/components/button-group';
import Grid from '@cloudscape-design/components/grid';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import SupportPromptGroup from '@cloudscape-design/chat-components/support-prompt-group';
import Alert from '@cloudscape-design/components/alert';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import { invokeAgent } from './agentcore';

interface AuthUser {
  email: string;
}

interface Message {
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  feedback?: 'helpful' | 'not-helpful';
  feedbackSubmitting?: boolean;
}

interface MessageFeedback {
  [messageIndex: number]: {
    feedback?: 'helpful' | 'not-helpful';
    submitting?: boolean;
    showCopySuccess?: boolean;
  };
}

interface SupportPrompt {
  id: string;
  text: string;
}

function App() {
  const isLocalDev = (import.meta as any).env.VITE_LOCAL_DEV === 'true';

  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [messageFeedback, setMessageFeedback] = useState<MessageFeedback>({});
  const [showSupportPrompts, setShowSupportPrompts] = useState(true);
  const [AuthModalComponent, setAuthModalComponent] = useState<any>(null);

  // Authentication effect
  useEffect(() => {
    if (isLocalDev) {
      setCheckingAuth(false);
      setUser({ email: 'local-dev@example.com' } as AuthUser);
    } else {
      checkAuth();
    }
  }, [isLocalDev]);

  // Lazy-load AuthModal
  useEffect(() => {
    if (!isLocalDev && showAuthModal && !AuthModalComponent) {
      import('./AuthModal').then(module => {
        setAuthModalComponent(() => module.default);
      });
    }
  }, [showAuthModal, AuthModalComponent, isLocalDev]);

  const checkAuth = async () => {
    if (isLocalDev) return;

    try {
      const { getCurrentUser } = await import('./auth');
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSignOut = async () => {
    if (isLocalDev) return;
    try {
      const { signOut } = await import('./auth');
      await signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    await checkAuth();
  };

  const cleanResponse = (text: string): string => {
    if (!text) return '';
    let cleaned = text.trim();
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    return cleaned;
  };

  const handleSupportPromptClick = (promptText: string) => {
    setPrompt(promptText);
    setShowSupportPrompts(false);
  };

  // ----------- SEND MESSAGE (non-streaming) -----------
  const handleSendMessage = async () => {
    console.log('handleSendMessage called. Current prompt:', prompt);

    if (!isLocalDev && !user) {
      setShowAuthModal(true);
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setShowSupportPrompts(false);

    const userMessage: Message = {
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const data = await invokeAgent({ prompt: currentPrompt });
      const finalContent = cleanResponse(data.response);

      const agentMessage: Message = {
        type: 'agent',
        content: finalContent,
        timestamp: new Date(),
      };

      console.log('Final agent text:', finalContent);
      setMessages(prev => [...prev, agentMessage]);
      setShowSupportPrompts(true);
    } catch (err: any) {
      console.error('handleSendMessage error:', err);
      setError(err.message || 'Failed to get response from agent');
    } finally {
      setLoading(false);
    }
  };
  // ----------------------------------------------------

  const getSupportPrompts = (): SupportPrompt[] => {
    if (messages.length === 0) {
      return [
        { id: 'calc', text: 'What is 123 + 456?' },
        { id: 'weather', text: "What's the weather like today?" },
        {
          id: 'table',
          text: 'Create a comparison table of 3 AWS services',
        },
        {
          id: 'math',
          text: 'Calculate 2048 * 1024 and explain the result',
        },
      ];
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.type === 'agent') {
      const content = lastMessage.content.toLowerCase();

      if (
        content.includes('result') ||
        content.includes('sum') ||
        content.includes('calculation')
      ) {
        return [
          {
            id: 'another-calc',
            text: 'Can you do another calculation?',
          },
          { id: 'weather-follow', text: "What's the weather?" },
          {
            id: 'explain',
            text: 'Can you explain that in more detail?',
          },
        ];
      }

      if (
        content.includes('weather') ||
        content.includes('sunny') ||
        content.includes('°f')
      ) {
        return [
          { id: 'calc-follow', text: 'What is 999 + 111?' },
          {
            id: 'table-follow',
            text: 'Show me a table with sample data',
          },
          { id: 'thanks', text: 'Thank you!' },
        ];
      }

      if (content.includes('|') || content.includes('table')) {
        return [
          {
            id: 'another-table',
            text: 'Create another table with different data',
          },
          {
            id: 'calc-after-table',
            text: 'Calculate 15 * 12',
          },
          {
            id: 'format',
            text: 'Can you format that differently?',
          },
        ];
      }
    }

    return [
      { id: 'more', text: 'Tell me more' },
      { id: 'calc-default', text: 'Do a calculation' },
      { id: 'weather-default', text: 'Check the weather' },
    ];
  };

  const handleFeedback = async (
    index: number,
    value: 'helpful' | 'not-helpful',
  ) => {
    setMessageFeedback(prev => ({
      ...prev,
      [index]: { ...prev[index], feedback: value },
    }));
  };

  const handleCopy = (index: number, content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setMessageFeedback(prev => ({
          ...prev,
          [index]: {
            ...prev[index],
            showCopySuccess: true,
          },
        }));
        setTimeout(() => {
          setMessageFeedback(prev => ({
            ...prev,
            [index]: {
              ...prev[index],
              showCopySuccess: false,
            },
          }));
        }, 1500);
      })
      .catch(err => console.error('Copy failed:', err));
  };

  if (checkingAuth) {
    return (
      <>
        <TopNavigation
          identity={{
            href: '#',
            title: 'Amazon Bedrock AgentCore Demo',
          }}
          utilities={[
            {
              type: 'button',
              text: user ? `${user.email} | Sign Out` : 'Sign In',
              iconName: user ? 'user-profile' : 'lock-private',
              onClick: () => {
                if (user) {
                  handleSignOut();
                } else {
                  setShowAuthModal(true);
                }
              },
            },
          ]}
          i18nStrings={{
            overflowMenuTriggerText: 'More',
            overflowMenuTitleText: 'All',
          }}
        />
        <AppLayout
          navigationHide={true}
          toolsHide={true}
          disableContentPaddings
          contentType="default"
          content={
            <ContentLayout defaultPadding>
              <Box textAlign="center" padding="xxl">
                Loading.
              </Box>
            </ContentLayout>
          }
        />
      </>
    );
  }

  return (
    <>
      {!isLocalDev && AuthModalComponent && (
        <AuthModalComponent
          visible={showAuthModal}
          onDismiss={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
      <TopNavigation
        identity={{
          href: '#',
          title: isLocalDev
            ? 'Amazon Bedrock AgentCore Demo (Local Dev)'
            : 'Amazon Bedrock AgentCore Demo',
        }}
        utilities={
          isLocalDev
            ? [
                {
                  type: 'button',
                  text: 'Local Development',
                  iconName: 'settings',
                },
              ]
            : [
                {
                  type: 'button',
                  text: user ? `${user.email} | Sign Out` : 'Sign In',
                  iconName: user ? 'user-profile' : 'lock-private',
                  onClick: () => {
                    if (user) {
                      handleSignOut();
                    } else {
                      setShowAuthModal(true);
                    }
                  },
                },
              ]
        }
        i18nStrings={{
          overflowMenuTriggerText: 'More',
          overflowMenuTitleText: 'All',
        }}
      />
      <AppLayout
        navigationHide={true}
        toolsHide={true}
        disableContentPaddings
        contentType="default"
        content={
          <ContentLayout defaultPadding>
            <Grid
              gridDefinition={[
                { colspan: { default: 12, xs: 1, s: 2 } },
                { colspan: { default: 12, xs: 10, s: 8 } },
                { colspan: { default: 12, xs: 1, s: 2 } },
              ]}
            >
              <div />
              <SpaceBetween size="l">
                {error && (
                  <Alert
                    type="error"
                    dismissible
                    onDismiss={() => setError('')}
                  >
                    {error}
                  </Alert>
                )}

                <Container>
                  <div role="region" aria-label="Chat">
                    <SpaceBetween size="m">
                      {messages.length === 0 ? (
                        <Box
                          textAlign="center"
                          padding={{ vertical: 'xxl' }}
                          color="text-body-secondary"
                        >
                          Start a conversation with the generative AI assistant
                          by typing a message below
                        </Box>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                          }}
                        >
                          {messages.map((message, index) => {
                            const feedback = messageFeedback[index];
                            const isAgent = message.type === 'agent';

                            return (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  justifyContent: isAgent
                                    ? 'flex-start'
                                    : 'flex-end',
                                }}
                              >
                                <Box
                                  padding="s"
                                  borderRadius="medium"
                                  backgroundColor={
                                    isAgent ? 'grey-100' : 'blue-100'
                                  }
                                  color="text-body"
                                  style={{
                                    whiteSpace: 'pre-wrap',
                                    maxWidth: '70%',
                                  }}
                                >
                                  {message.content}
                                  {isAgent && (
                                    <Box
                                      margin={{ top: 'xs' }}
                                      display="flex"
                                      justifyContent="space-between"
                                      alignItems="center"
                                    >
                                      <ButtonGroup
                                        items={[
                                          {
                                            text: '👍',
                                            disabled:
                                              feedback?.feedback === 'helpful',
                                            onClick: () =>
                                              handleFeedback(index, 'helpful'),
                                          },
                                          {
                                            text: '👎',
                                            disabled:
                                              feedback?.feedback ===
                                              'not-helpful',
                                            onClick: () =>
                                              handleFeedback(
                                                index,
                                                'not-helpful',
                                              ),
                                          },
                                          {
                                            text: feedback?.showCopySuccess
                                              ? 'Copied!'
                                              : 'Copy',
                                            onClick: () =>
                                              handleCopy(
                                                index,
                                                message.content,
                                              ),
                                          },
                                        ]}
                                      />
                                      <StatusIndicator type="success">
                                        {message.timestamp.toLocaleTimeString()}
                                      </StatusIndicator>
                                    </Box>
                                  )}
                                  {!isAgent && (
                                    <Box
                                      margin={{ top: 'xs' }}
                                      textAlign="right"
                                    >
                                      <StatusIndicator type="success">
                                        {message.timestamp.toLocaleTimeString()}
                                      </StatusIndicator>
                                    </Box>
                                  )}
                                </Box>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {showSupportPrompts && (
                        <SupportPromptGroup
                          items={getSupportPrompts().map(p => ({
                            id: p.id,
                            content: p.text,
                          }))}
                          onItemClick={item =>
                            handleSupportPromptClick(item.content as string)
                          }
                        />
                      )}

                      <Box
                        display="flex"
                        alignItems="center"
                        margin={{ top: 's' }}
                      >
                        <Box flexGrow={1}>
                          <Input
                            value={prompt}
                            onChange={e => setPrompt(e.detail.value)}
                            placeholder="Ask a question about HR errors…"
                            disabled={loading}
                            onKeyDown={e => {
                              // @ts-expect-error - Cloudscape event type
                              if (e.detail?.key === 'Enter') {
                                e.preventDefault?.();
                                handleSendMessage();
                              }
                            }}
                          />
                        </Box>
                        <Box margin={{ left: 's' }}>
                          <Button
                            variant="primary"
                            onClick={handleSendMessage}
                            disabled={loading}
                          >
                            Send
                          </Button>
                        </Box>
                      </Box>
                    </SpaceBetween>
                  </div>
                </Container>
              </SpaceBetween>
              <div />
            </Grid>
          </ContentLayout>
        }
      />
    </>
  );
}

export default App;

