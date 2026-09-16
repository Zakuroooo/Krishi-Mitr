/**
 * Web entry point. Mounts the same `App` the phone mounts.
 */

import { AppRegistry } from 'react-native';
import App from './App';
import appJson from './app.json';

// react-native-web needs the root chain to be a full-height flex column, or
// every `flex: 1` screen inside it collapses to zero height.
const style = document.createElement('style');
style.type = 'text/css';
style.appendChild(
  document.createTextNode(`
  html, body, #root {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    background-color: #FAF6EE;
  }
  #root > div {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  /* A farmer on a phone browser gets the app full-bleed. On a laptop the
     same screens would stretch to 1400px and look nothing like the product,
     so the column is capped and centred on a parchment ground — the page
     still shows one app, not a stretched one. */
  @media (min-width: 900px) {
    body {
      background-color: #F1EDE6;
    }
    #root {
      align-items: center;
    }
    #root > div {
      max-width: 1180px;
      box-shadow: 0 0 0 1px #DCC9A8, 0 24px 60px -32px rgba(28, 28, 23, 0.35);
    }
  }
`),
);
document.head.appendChild(style);

const appName = appJson.name || 'KrishiMitr';

AppRegistry.registerComponent(appName, () => App);

AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
