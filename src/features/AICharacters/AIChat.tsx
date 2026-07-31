import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useSelector, useDispatch, RootStateOrAny } from 'react-redux';
import classNames from 'classnames';
import { useParams, useHistory } from 'react-router-dom';
import {
  sendMessage,
  addMessage,
  clearChat,
  updateRelationship,
} from './AICharactersStore';
import { fetchCharacterById, Character } from 'features/Social/SocialStore';
import { ChatMessage } from './types';
import './AIChat.scss';

const AIChat: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const history = useHistory();
  const dispatch = useDispatch();

  // Get character from both the legacy AI store and the social store
  const { characters, currentChat, isTyping } = useSelector(
    ({ aiCharacters }: RootStateOrAny) => aiCharacters,
  );
  const { currentCharacter } = useSelector(
    ({ social }: RootStateOrAny) => social,
  );
  const userSession = useSelector(({ user }: RootStateOrAny) => user?.session);

  // Try to find character from legacy store first, then social store's currentCharacter
  const legacyChar = characters.find((c: any) => c.id === characterId);
  const apiChar = currentCharacter?.id === characterId ? currentCharacter : null;

  // Merge character data - prefer API data when available
  const character = apiChar
    ? {
        id: apiChar.id,
        name: apiChar.name,
        avatar: apiChar.avatarUrl || null,
        description: apiChar.description || '',
        personality: '',
        backstory: '',
        age: apiChar.ageDisplay || '',
        gender: apiChar.gender || '',
        relationshipLevel: 1,
        emotions: [],
        lastMessage: '',
        timestamp: '',
        unread: 0,
        createdAt: '',
        memories: [],
      }
    : legacyChar;

  const messageContainer = useRef<HTMLElement>(null);
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Load character from API on mount (direct URL access)
  useEffect(() => {
    if (characterId) {
      dispatch(fetchCharacterById(characterId));
    }
  }, [characterId, dispatch]);

  useEffect(() => {
    if (!legacyChar && !apiChar) {
      // Give time for the API fetch, don't redirect immediately if loading
      const timer = setTimeout(() => {
        if (!currentCharacter) {
          history.push('/ai');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [legacyChar, apiChar, currentCharacter, history]);

  useLayoutEffect(() => {
    if (messageContainer.current) {
      messageContainer.current.scrollTop = messageContainer.current.scrollHeight;
    }
  }, [currentChat, isTyping]);

  const handleSubmit = async () => {
    if (!message.trim() || !character) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      characterId: character.id,
      sender: 'user',
      content: message,
      type: 'text',
      timestamp: new Date().toISOString(),
    };

    dispatch(addMessage(userMessage));
    setMessage('');
    dispatch(updateRelationship({ characterId: character.id, delta: 0.1 }));

    try {
      await dispatch(sendMessage({ characterId: character.id, message: message }));
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear chat history? Character will still remember you.')) {
      dispatch(clearChat(characterId));
      setShowMenu(false);
    }
  };

  const handleBack = () => {
    history.push('/ai');
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const getAvatarColor = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get user avatar for composer
  const userAvatarUrl = userSession?.avatar || userSession?.avatarUrl || '';
  const userInitial = (userSession?.username || userSession?.fullName || 'Y').charAt(0).toUpperCase();
  const userAvatarColor = getAvatarColor(userSession?.username || 'User');

  if (!character) {
    return <div className="ai-chat ai-chat--loading">Loading character...</div>;
  }

  return (
    <main className="ai-chat">
      <header className="ai-chat__header">
        <button className="btn-back" onClick={handleBack}>
          <i className="fas fa-arrow-left" />
        </button>

        <div className="ai-chat__user">
          <div className="ai-chat__avatar">
            {character.avatar ? (
              <img src={character.avatar} alt={character.name} style={{ maxWidth: '100%' }} />
            ) : (
              <div
                className="ai-chat__initial"
                style={{ backgroundColor: getAvatarColor(character.name) }}
              >
                {getInitial(character.name)}
              </div>
            )}
            <span className="ai-chat__status" />
          </div>
          <div className="ai-chat__info" style={{ minWidth: 0 }}>
            <h2 style={{ overflowWrap: 'anywhere' }}>{character.name}</h2>
            <span className="ai-chat__status-text">
              {isTyping ? 'typing...' : 'online'}
            </span>
          </div>
        </div>

        <div className="ai-chat__actions">
          <div className="ai-chat__relationship">
            {[...Array(10)].map((_, i) => (
              <span
                key={i}
                className={classNames('heart', {
                  'heart--active': i < (character.relationshipLevel || 1),
                })}
              >
                ♥
              </span>
            ))}
          </div>
          <button className="btn-menu" onClick={() => setShowMenu(!showMenu)}>
            <i className="fas fa-ellipsis-v" />
          </button>
        </div>

        {showMenu && (
          <div className="ai-chat__menu" style={{ zIndex: 1000 }}>
            <button onClick={handleClearChat}>
              <i className="fas fa-trash" /> Clear Chat
            </button>
            <button onClick={() => history.push('/ai/create')}>
              <i className="fas fa-edit" /> Edit Character
            </button>
          </div>
        )}
      </header>

      <section ref={messageContainer} className="ai-chat__messages">
        {currentChat.length === 0 && (
          <div className="ai-chat__empty">
            <div
              className="ai-chat__empty-avatar"
              style={{ backgroundColor: getAvatarColor(character.name) }}
            >
              {getInitial(character.name)}
            </div>
            <h3>{character.name}</h3>
            <p>{character.description}</p>
            <div className="ai-chat__emotions">
              {character.emotions?.map((emotion: string, i: number) => (
                <span key={i} className="emotion-tag">
                  {emotion}
                </span>
              ))}
            </div>
          </div>
        )}

        {currentChat.map((msg: ChatMessage) => (
          <article
            key={msg.id}
            className={classNames('ai-chat__message', {
              'ai-chat__message--user': msg.sender === 'user',
              'ai-chat__message--character': msg.sender === 'character',
            })}
          >
            {msg.sender === 'character' && (
              <div className="ai-chat__message-avatar">
                {character.avatar ? (
                  <img src={character.avatar} alt={character.name} style={{ maxWidth: '100%' }} />
                ) : (
                  <div
                    className="ai-chat__message-initial"
                    style={{ backgroundColor: getAvatarColor(character.name) }}
                  >
                    {getInitial(character.name)}
                  </div>
                )}
              </div>
            )}
            <div className="ai-chat__message-content" style={{ minWidth: 0 }}>
              <blockquote style={{ overflowWrap: 'anywhere' }}>{msg.content}</blockquote>
              <time>{formatTime(msg.timestamp)}</time>
            </div>
          </article>
        ))}

        {isTyping && (
          <article className="ai-chat__message ai-chat__message--character">
            <div className="ai-chat__message-avatar">
              {character.avatar ? (
                <img src={character.avatar} alt={character.name} style={{ maxWidth: '100%' }} />
              ) : (
                <div
                  className="ai-chat__message-initial"
                  style={{ backgroundColor: getAvatarColor(character.name) }}
                >
                  {getInitial(character.name)}
                </div>
              )}
            </div>
            <div className="ai-chat__message-content ai-chat__typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </article>
        )}
      </section>

      <footer className="ai-chat__footer">
        <div className="ai-chat__input-wrapper">
          {/* User avatar in composer */}
          <div className="ai-chat__composer-avatar">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="You" style={{ maxWidth: '100%' }} />
            ) : (
              <div
                className="ai-chat__initial"
                style={{ backgroundColor: userAvatarColor }}
              >
                {userInitial}
              </div>
            )}
          </div>
          <textarea
            className="ai-chat__input"
            placeholder="Send a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button
            className={classNames('btn-send', { 'btn-send--active': message.trim() })}
            onClick={handleSubmit}
            disabled={!message.trim()}
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>
      </footer>
    </main>
  );
};

export default AIChat;
