import React, { useState } from 'react';
import { useDispatch, useSelector, RootStateOrAny } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { addCharacter, generateSuggestions } from './AICharactersStore';
import { AICharacter } from './types';
import Button from 'components/Button/Button';
import './AICreate.scss';

const AICreate: React.FC = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { loading } = useSelector(({ aiCharacters }: RootStateOrAny) => aiCharacters);

  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    description: '',
    backstory: '',
    age: '',
    gender: '',
    avatar: null as string | null
  });

  const [hints, setHints] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, avatar: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a character name first');
      return;
    }

    try {
      const action = await dispatch(
        generateSuggestions({
          name: formData.name,
          hints: hints
        })
      );

      const result = (action as any).payload;
      if (result) {
        setFormData({
          ...formData,
          personality: result.personality || formData.personality,
          description: result.description || formData.description,
          backstory: result.backstory || formData.backstory,
          age: result.age || formData.age,
          gender: result.gender || formData.gender
        });
        setShowSuggestions(true);
        setTimeout(() => setShowSuggestions(false), 3000);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      alert('Failed to generate suggestions. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a character name');
      return;
    }

    const newCharacter: AICharacter = {
      id: Date.now().toString(),
      name: formData.name,
      avatar: formData.avatar,
      personality: formData.personality || 'Friendly and curious',
      description: formData.description || 'A unique character',
      backstory: formData.backstory || '',
      age: formData.age || '',
      gender: formData.gender || '',
      relationshipLevel: 1,
      emotions: ['happy'],
      lastMessage: 'Just created!',
      timestamp: 'Just now',
      unread: 0,
      createdAt: new Date().toISOString(),
      memories: []
    };

    dispatch(addCharacter(newCharacter));
    history.push('/ai-characters');
  };

  const handleBack = () => {
    history.push('/ai-characters');
  };

  return (
    <main className="ai-create">
      <header className="ai-create__header">
        <button className="btn-back" onClick={handleBack}>
          <i className="fas fa-arrow-left" />
        </button>
        <h1>Create Character</h1>
        <div className="spacer" />
      </header>

      <form className="ai-create__form" onSubmit={handleSubmit}>
        <div className="ai-create__section">
          <label className="ai-create__label">
            <i className="fas fa-user" />
            Character Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="ai-create__input"
            placeholder="Enter character name"
            required
          />
        </div>

        <div className="ai-create__section">
          <label className="ai-create__label">
            <i className="fas fa-image" />
            Avatar
          </label>
          <div className="ai-create__avatar-upload">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Avatar preview"
                className="ai-create__avatar-preview"
              />
            ) : (
              <div className="ai-create__avatar-placeholder">
                <i className="fas fa-camera" />
                <span>Upload Image</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="ai-create__file-input"
            />
          </div>
        </div>

        <div className="ai-create__section ai-create__section--ai">
          <div className="ai-create__ai-header">
            <label className="ai-create__label">
              <i className="fas fa-magic" />
              AI Auto-Fill
            </label>
            <Button
              onClick={handleGenerateSuggestions}
              className="btn-ai"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Generating...' : '✨ Generate'}
            </Button>
          </div>
          <input
            type="text"
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            className="ai-create__input ai-create__input--hints"
            placeholder="Optional hints (e.g., 'mysterious detective from London')"
          />
          <p className="ai-create__hint">
            Enter a name and click Generate to get AI suggestions for personality,
            description, and backstory
          </p>
        </div>

        {showSuggestions && (
          <div className="ai-create__success">
            <i className="fas fa-check-circle" />
            Suggestions applied! Edit them as needed.
          </div>
        )}

        <div className="ai-create__section">
          <label className="ai-create__label">
            <i className="fas fa-heart" />
            Personality
          </label>
          <textarea
            name="personality"
            value={formData.personality}
            onChange={handleChange}
            className="ai-create__textarea"
            placeholder="Describe the character's personality traits..."
            rows={3}
          />
        </div>

        <div className="ai-create__section">
          <label className="ai-create__label">
            <i className="fas fa-palette" />
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="ai-create__textarea"
            placeholder="Brief description of the character..."
            rows={2}
          />
        </div>

        <div className="ai-create__section">
          <label className="ai-create__label">
            <i className="fas fa-book" />
            Backstory
          </label>
          <textarea
            name="backstory"
            value={formData.backstory}
            onChange={handleChange}
            className="ai-create__textarea"
            placeholder="Character's background story..."
            rows={3}
          />
        </div>

        <div className="ai-create__row">
          <div className="ai-create__section ai-create__section--half">
            <label className="ai-create__label">
              <i className="fas fa-calendar" />
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="ai-create__input"
              placeholder="Age"
              min="1"
              max="150"
            />
          </div>

          <div className="ai-create__section ai-create__section--half">
            <label className="ai-create__label">
              <i className="fas fa-venus-mars" />
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="ai-create__select"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <button type="submit" className="ai-create__submit">
          <i className="fas fa-plus" />
          Create Character
        </button>
      </form>
    </main>
  );
};

export default AICreate;
