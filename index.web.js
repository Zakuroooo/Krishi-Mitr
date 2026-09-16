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
  /* A farmer on a phone browser gets the app full-bleed.

     On a laptop the first cut capped the column at 1180px and left everything
     inside it at phone size, so a 27-inch screen showed small cards floating
     in a lot of parchment — it read as a phone screenshot, not as a web app.
     Two changes fix that without touching a single screen's code:

       - the column gets wider in steps, so rows that can wrap (price tiles,
         lot cards, the two gain/risk figures) actually use the width;
       - zoom scales the whole app up on large displays. Type, touch targets,
         chart bars and padding all grow together, which keeps the proportions
         the design system specifies instead of leaving 16px text stranded in a
         1400px column. zoom rather than transform: scale() because zoom
         reflows — a transform would leave the layout phone-sized and merely
         magnify it, blurring edges and breaking hit targets.

     (No backticks in this comment: it lives inside a template literal, and a
     backtick here ends the string and breaks the build.) */
  @media (min-width: 900px) {
    body {
      background: radial-gradient(1200px 600px at 50% 0%, #F7F3EB 0%, #EDE7DC 100%);
    }
    #root {
      align-items: center;
      padding: 20px 16px;
    }
    #root > div {
      max-width: 1100px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 0 0 1px #DCC9A8, 0 30px 70px -36px rgba(28, 28, 23, 0.4);
    }
  }

  @media (min-width: 1280px) {
    #root > div {
      max-width: 1240px;
      zoom: 1.12;
    }
  }

  @media (min-width: 1680px) {
    #root > div {
      max-width: 1320px;
      zoom: 1.22;
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
