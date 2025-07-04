import React, { useEffect } from 'react';
import { setup } from './js/main';
import './App.css';

function App() {
  useEffect(() => {
    setup();
  }, []);

  return (
  <div id="container">
    <h1>Receiver Sample</h1>

    <div id="warning" hidden={true}></div>

    <div id="player"></div>

    <div class="box">
      <span>Codec preferences:</span>
      <select id="codecPreferences" autocomplete="off" disabled>
        <option selected value="">Default</option>
      </select>
    </div>

    <div className="box">
      <span>Lock Cursor to Player:</span>
      <input type="checkbox" id="lockMouseCheck" autocomplete="off" />
    </div>

    <p>
      For more information about sample, see
        <a href="https://docs.unity3d.com/Packages/com.unity.renderstreaming@3.1/manual/sample-broadcast.html">Broadcast sample</a> document page.
    </p>

    <div id="message"></div>

    <section>
      <a href="https://github.com/Unity-Technologies/UnityRenderStreaming/tree/develop/WebApp/client/public/receiver"
        title="View source for this page on GitHub" id="viewSource">View source on GitHub</a>
    </section>
  </div>
  );
}

export default App;
