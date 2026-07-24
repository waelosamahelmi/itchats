import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import app from 'AppShell/AppShellStore';
import camera from 'features/Camera/CameraStore';
import user from 'features/User/UserStore';
import snapMap from 'features/SnapMap/SnapMapStore';
import snap from 'features/Snap/SnapStore';
import chat from 'features/Chat/ChatStore';
import aiCharacters from 'features/AICharacters/AICharactersStore';

import AppShell from 'AppShell/AppShell';
import Camera from 'features/Camera/Camera';
import AICharacters from 'features/AICharacters/AICharacters';
import AIChat from 'features/AICharacters/AIChat';
import AICreate from 'features/AICharacters/AICreate';
import ChatTab from 'features/Chat/ChatTab';
import SnapMap from 'features/SnapMap/SnapMap';
import Account from 'features/Account/Account';
import NotFound from 'features/404/404';

import 'normalize.css';
import 'animate.css';
import './styles/app.scss';

export const store = configureStore({
  reducer: { app, camera, user, snapMap, snap, chat, aiCharacters }
});

const App = () => (
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppShell>
          <Switch>
            {/* Camera Tab */}
            <Route path="/" component={Camera} exact />

            {/* AI Tab */}
            <Route path="/ai" component={AICharacters} exact />
            <Route path="/ai/chat/:characterId" component={AIChat} exact />
            <Route path="/ai/create" component={AICreate} exact />

            {/* Chats Tab */}
            <Route path="/chats" component={ChatTab} exact />

            {/* Map Tab */}
            <Route path="/map" component={SnapMap} exact />

            {/* Profile Tab */}
            <Route path="/account" component={Account} exact />

            {/* 404 */}
            <Route component={NotFound} />
          </Switch>
        </AppShell>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

ReactDOM.render(<App />, document.getElementById('root'));
