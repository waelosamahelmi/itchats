import React, { useState } from 'react';
import { useSelector, useDispatch, RootStateOrAny } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import { deleteCharacter, setCurrentCharacter } from './AICharactersStore';
import Button from 'components/Button/Button';
import './AICharacters.scss';

const AICharacters: React.FC = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { characters } = useSelector(({ aiCharacters }: RootStateOrAny) => aiCharacters);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCharacters = characters.filter((char: any) =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChatClick = (characterId: string) => {
    dispatch(setCurrentCharacter(characterId));
    history.push(`/ai-chat/${characterId}`);
  };

  const handleCreateClick = () => {
    history.push('/ai-create');
  };

  const handleDeleteClick = (e: React.MouseEvent, characterId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this character?')) {
      dispatch(deleteCharacter(characterId));
    }
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

  return (
    <main className="ai-characters">
      <header className="ai-characters__header">
        <h1>AI Characters</h1>
        <Button icon="faPlus" onClick={handleCreateClick} className="btn-create" />
      </header>

      <div className="ai-characters__search">
        <input
          type="text"
          placeholder="Search characters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <section className="ai-characters__list">
        {filteredCharacters.length === 0 ? (
          <div className="empty-state">
            <p>No characters found</p>
            <Button onClick={handleCreateClick} className="btn-primary">
              Create Your First Character
            </Button>
          </div>
        ) : (
          filteredCharacters.map((character: any) => (
            <article
              key={character.id}
              className="character-card"
              onClick={() => handleChatClick(character.id)}
            >
              <div className="character-card__avatar">
                {character.avatar ? (
                  <img src={character.avatar} alt={character.name} />
                ) : (
                  <div
                    className="character-card__initial"
                    style={{ backgroundColor: getAvatarColor(character.name) }}
                  >
                    {getInitial(character.name)}
                  </div>
                )}
                {character.unread > 0 && (
                  <span className="character-card__badge">{character.unread}</span>
                )}
              </div>

              <div className="character-card__info">
                <div className="character-card__header">
                  <h3>{character.name}</h3>
                  <span className="character-card__time">{character.timestamp}</span>
                </div>
                <p className="character-card__message">{character.lastMessage}</p>
                <div className="character-card__meta">
                  <div className="character-card__relationship">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={classNames('dot', {
                          'dot--active': i < Math.ceil(character.relationshipLevel / 2)
                        })}
                      />
                    ))}
                  </div>
                  <div className="character-card__emotions">
                    {character.emotions?.slice(0, 2).map((emotion: string, i: number) => (
                      <span key={i} className="emotion-tag">
                        {emotion}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="character-card__actions">
                <button
                  className="btn-delete"
                  onClick={(e) => handleDeleteClick(e, character.id)}
                  title="Delete character"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
};

export default AICharacters;
