
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';
import Signup from './src/Pages/Signup';
import SignupCheer from './src/Pages/SignupCheer';
import { MotionConfig } from 'framer-motion';

import { HashRouter, Routes, Route } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup-cheer" element={<SignupCheer />} />
          <Route path="*" element={<App />} />
        </Routes>
      </HashRouter>
    </MotionConfig>
  </React.StrictMode>
);