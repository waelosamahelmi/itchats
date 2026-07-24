import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getSession, getFriends } from 'features/User/UserStore';
import { getPhotos } from 'features/Camera/CameraStore';
import Header from 'components/Header/Header';
import Toolbar from './Toolbar/Toolbar';
import Drawer from './Drawer/Drawer';
import TabBar from './TabBar/TabBar';

const AppShell: React.FC = ({ children }) => {
  const dispatch = useDispatch();

  // Init the app
  useEffect(() => {
    dispatch(getSession());
    dispatch(getFriends());
    dispatch(getPhotos());
  }, []);

  return (
    <>
      <Toolbar />
      <Header />
      <section className="view">{children}</section>
      <Drawer />
      <TabBar />
    </>
  );
};

export default AppShell;
