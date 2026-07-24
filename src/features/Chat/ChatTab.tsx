import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useSelector, useDispatch, RootStateOrAny } from 'react-redux';
import classNames from 'classnames';
import { getMessages, postMessage } from './ChatStore';
import { Message } from './data';
import Input from 'components/Input/Input';
import Avatar from 'components/Avatar/Avatar';
import Pill from 'components/Pill/Pill';
import Button from 'components/Button/Button';
import Loader from 'components/Loader/Loader';
import Error from 'components/Error/Error';
import './ChatTab.scss';

const ChatTab: React.FC = () => {
  const dispatch = useDispatch();
  const {
    user: {
      session: { username }
    },
    chat: { thread, messages }
  } = useSelector(({ user, chat }: RootStateOrAny) => ({ user, chat }));

  const messageContainer = useRef<HTMLElement>(null);
  const audioElem = useRef<HTMLAudioElement>(null);

  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [selectedThread, setSelectedThread] = useState(thread);

  useEffect(() => {
    dispatch(getMessages(selectedThread));
  }, [selectedThread]);

  useLayoutEffect(() => {
    if (messageContainer.current) {
      messageContainer.current.scrollTop = messageContainer.current.scrollHeight;
    }
  }, [messages]);

  const submitMessage = () => {
    if (message.length) {
      dispatch(postMessage(username, message));
      setMessage('');
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          dispatch(postMessage(selectedThread, 'Hey! Thanks for your message 😊'));
          setTyping(false);
        }, 1500);
      }, 500);
    }
  };

  const threads = ['Lisa', 'Mike', 'Sarah', 'Tom'];

  return (
    <main className="chat-tab">
      {/* Thread list sidebar */}
      <aside className="chat-tab__threads">
        <header className="chat-tab__threads-header">
          <h2>Chats</h2>
        </header>
        <div className="chat-tab__thread-list">
          {threads.map((t) => (
            <button
              key={t}
              className={classNames('chat-tab__thread', {
                'chat-tab__thread--active': selectedThread === t
              })}
              onClick={() => setSelectedThread(t)}
            >
              <Avatar src="./images/bitmoji-other.png" />
              <div className="chat-tab__thread-info">
                <strong>{t}</strong>
                <span>Tap to chat</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <section className="chat-tab__messages">
        <header className="chat-tab__header">
          <Avatar src="./images/bitmoji-other.png" />
          <div>
            <h2>{selectedThread}</h2>
            <span className="chat-tab__status">Online</span>
          </div>
          <div className="chat-tab__actions">
            <Pill icons={['faPhoneAlt', 'faVideo']} />
          </div>
        </header>

        <section ref={messageContainer} className="chat-tab__message-list">
          {messages.loading ? (
            <Loader message="Loading messages" />
          ) : messages.error ? (
            <Error message="Failed to load messages" />
          ) : (
            messages.data?.map((msg: Message) => (
              <article
                key={msg.id}
                className={classNames('chat-tab__bubble', {
                  'chat-tab__bubble--mine': msg.author === username
                })}
              >
                <span className="chat-tab__bubble-text">{msg.message}</span>
              </article>
            ))
          )}

          {typing && (
            <div className="chat-tab__typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
        </section>

        <footer className="chat-tab__input-bar">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onEnter={submitMessage}
            placeholder="Send a message..."
          />
          <Button icon="faPaperPlane" onClick={submitMessage} />
        </footer>
      </section>

      <audio ref={audioElem} className="app-sound" />
    </main>
  );
};

export default ChatTab;
