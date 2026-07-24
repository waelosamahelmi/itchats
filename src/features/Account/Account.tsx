import React from 'react';
import { useSelector, RootStateOrAny } from 'react-redux';
import { language } from 'utils';
import Section from 'components/Section/Section';
import MenuItem from 'components/MenuItem/MenuItem';
import Icon from 'components/Icon/Icon';
import Map from './Map/Map';
import { Logo } from './Logo.svg';
import './Account.scss';

const currentDate = new Date().toLocaleDateString(language, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const Account: React.FC = () => {
  const {
    session: { username }
  } = useSelector(({ user }: RootStateOrAny) => user);

  return (
    <main className="account">
      <header>
        <h2>Profile</h2>
        <Icon name="faCog" className="ico-gear" />
      </header>
      <div className="logo">
        <Logo />
        <strong>{username}</strong>
      </div>
      <Section header="Stories" transparent>
        <MenuItem leftIcon="faCamera" rightIcon="faEllipsisV" label="Add to My Story" />
        <MenuItem leftIcon="faCamera" rightIcon="faEllipsisV" label="Add to Our Story" />
      </Section>
      <Section header="Friends" transparent>
        <MenuItem leftIcon="faUserPlus" rightIcon="faAngleRight" label="Add Friends" />
        <MenuItem leftIcon="faListAlt" rightIcon="faAngleRight" label="My Friends" />
      </Section>
      <Section header="Bitmoji" transparent>
        <MenuItem leftIcon="faGrinBeam" rightIcon="faAngleRight" label="Create Bitmoji" />
      </Section>
      <Section header="Snap Map">
        <Map />
        <MenuItem
          leftIcon="faCompass"
          rightIcon="faAngleRight"
          label="Set a Status"
          straightEdge
        />
      </Section>
      <footer>
        <p>
          <Icon name="faGithub" />
          Joined ItChats AI on {currentDate}
        </p>
      </footer>
    </main>
  );
};

export default Account;
