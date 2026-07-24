import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useSelector, useDispatch, RootStateOrAny } from 'react-redux';
import classNames from 'classnames';
import { useParams, useHistory } from 'react-router-dom';
import {
  sendMessage,
  addMessage,
  clearChat,
  updateRelationship
} from './AICharactersStore';
import { ChatMessage } from './types';
import './AIChat.scss';

const AIChat: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const history = useHistory();
  const dispatch = useDispatch();
  const { characters, currentChat, isTyping } = useSelector(
    ({ aiCharacters }: RootStateOrAny) => aiCharacters
  );

  const character = characters.find((c: any) => c.id === characterId);

  const messageContainer = useRef<HTMLElement>(null);
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!character) {
      history.push('/ai');
    }
  }, [character, history]);

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
      timestamp: new Date().toISOString()
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
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!character) {
    return <div className="ai-chat ai-chat--loading">Loading...</div>;
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
              <img src={character.avatar} alt={character.name} />
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
          <div className="ai-chat__info">
            <h2>{character.name}</h2>
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
                  'heart--active': i < character.relationshipLevel
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
          <div className="ai-chat__menu">
            <button onClick={handleClearChat}>
              <i className="fas fa-trash" /> Clear Chat
            </button>
            <button onClick={() => history.push(`/ai/create`)}>
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
              'ai-chat__message--character': msg.sender === 'character'
            })}
          >
            {msg.sender === 'character' && (
              <div className="ai-chat__message-avatar">
                {character.avatar ? (
                  <img src={character.avatar} alt={character.name} />
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
            <div className="ai-chat__message-content">
              <blockquote>{msg.content}</blockquote>
              <time>{formatTime(msg.timestamp)}</time>
            </div>
          </article>
        ))}

        {isTyping && (
          <article className="ai-chat__message ai-chat__message--character">
            <div className="ai-chat__message-avatar">
              {character.avatar ? (
                <img src={character.avatar} alt={character.name} />
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
          <button className="btn-emoji">
            <i className="far fa-smile" />
          </button>
          <textarea
            className="ai-chat__input"
            placeholder="Send a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button className="btn-camera">
            <i className="fas fa-camera" />
          </button>
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
