import React, { useEffect } from 'react';
import { useSelector, useDispatch, RootStateOrAny } from 'react-redux';
import {
  fetchMyCharacters,
  fetchDiscoverCharacters,
  followCharacter,
  Character,
} from 'features/Social/SocialStore';
import Header from 'components/Header/Header';
import Section from 'components/Section/Section';
import Button from 'components/Button/Button';
import './Discover.scss';

const safeNum = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const Discover: React.FC = () => {
  const dispatch = useDispatch();
  const { mine, discover, discoverLoading, charactersLoading, followLoading } = useSelector(
    ({ social }: RootStateOrAny) => social,
  );

  useEffect(() => {
    dispatch(fetchMyCharacters());
    dispatch(fetchDiscoverCharacters({ page: 1 }));
  }, [dispatch]);

  const handleFollow = (character: Character) => {
    const currentlyFollowing = Boolean(character.isFollowing);
    // Optimistic update
    dispatch({
      type: 'social/followCharacter/pending',
      meta: { arg: { characterId: character.id, isFollowing: currentlyFollowing } },
    });
    dispatch(followCharacter({ characterId: character.id, isFollowing: currentlyFollowing }));
  };

  const renderCharacterCard = (character: Character) => {
    const initial = character.name?.charAt(0)?.toUpperCase() || '?';
    const avatarColor = `hsl(${(character.name?.charCodeAt(0) || 0) % 360}, 50%, 50%)`;
    const isFollowing = Boolean(character.isFollowing);

    return (
      <div key={character.id} className="discover-card">
        <div className="discover-card__avatar">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              style={{ maxWidth: '100%', overflowWrap: 'anywhere' }}
            />
          ) : (
            <div
              className="discover-card__initial"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>
          )}
        </div>
        <div className="discover-card__info" style={{ minWidth: 0 }}>
          <div className="discover-card__header">
            <h3 className="discover-card__name">{character.name}</h3>
            {character.score != null && (
              <span className="discover-card__score" title="Character Score">
                ★ {safeNum(character.score)}
              </span>
            )}
          </div>
          {character.mood && <p className="discover-card__mood">{character.mood}</p>}
          <p className="discover-card__desc" style={{ overflowWrap: 'anywhere' }}>
            {character.description?.slice(0, 80)}
          </p>
          <div className="discover-card__meta">
            <span>{safeNum(character.followersCount)} followers</span>
            {character.ageDisplay && <span>{character.ageDisplay}</span>}
          </div>
        </div>
        <Button
          label={isFollowing ? 'Following' : 'Follow'}
          purple={!isFollowing}
          onClick={() => handleFollow(character)}
          disabled={followLoading[character.id]}
        />
      </div>
    );
  };

  return (
    <main className="discover">
      <Header insideDrawer />

      <section className="view">
        {/* Private Characters (Mine) */}
        <Section header="My Characters" transparent>
          <div className="inner">
            {charactersLoading ? (
              <p>Loading your characters...</p>
            ) : mine.length ? (
              mine.map(renderCharacterCard)
            ) : (
              <p>No characters yet. Create one!</p>
            )}
          </div>
        </Section>

        {/* Public Discover */}
        <Section header="Discover" transparent>
          <div className="inner">
            {discoverLoading ? (
              <p>Loading discover...</p>
            ) : discover.length ? (
              discover.map(renderCharacterCard)
            ) : (
              <p>No characters to discover yet.</p>
            )}
          </div>
        </Section>
      </section>
    </main>
  );
};

export default Discover;
