import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

const apiBaseUrl =
  process.env.REACT_APP_API_URL ||
  `http://${window.location.hostname}:5000`;

axios.defaults.baseURL = apiBaseUrl;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
