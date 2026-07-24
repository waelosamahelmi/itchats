import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import Icon from 'components/Icon/Icon';
import './TabBar.scss';

interface Tab {
  path: string;
  icon: string;
  label: string;
  isAi?: boolean;
}

const tabs: Tab[] = [
  { path: '/', icon: 'faCamera', label: 'Camera' },
  { path: '/chats', icon: 'faCommentAlt', label: 'Chats' },
  { path: '/ai', icon: 'faRobot', label: 'AI', isAi: true },
  { path: '/map', icon: 'faMapMarkerAlt', label: 'Map' },
  { path: '/account', icon: 'faUserCircle', label: 'Profile' }
];

const TabBar: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={classNames('tabbar__item', {
            'tabbar__item--active': isActive(tab.path),
            'tabbar__item--ai': tab.isAi
          })}
          onClick={() => history.push(tab.path)}
        >
          <Icon name={tab.icon} />
          <span className="tabbar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default TabBar;
