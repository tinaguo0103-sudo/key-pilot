(function () {
  const CHANNELS = {
    room: {
      queueKey: "__KEY_PILOT_ROOM_EVENT_QUEUE__",
      latestKey: "__KEY_PILOT_ROOM_EVENT__",
      snapshotKey: "__KEY_PILOT_ROOM_SNAPSHOT__",
      limit: 16
    },
    cruise: {
      queueKey: "__KEY_PILOT_CRUISE_EVENT_QUEUE__",
      latestKey: "__KEY_PILOT_CRUISE_EVENT__",
      snapshotKey: "__KEY_PILOT_CRUISE_SNAPSHOT__",
      limit: 20
    },
    home: {
      queueKey: "__KEY_PILOT_HOME_EVENT_QUEUE__",
      latestKey: "__KEY_PILOT_HOME_EVENT__",
      snapshotKey: "__KEY_PILOT_HOME_SNAPSHOT__",
      limit: 12
    }
  };

  function getChannel(name) {
    const channel = CHANNELS[name];
    if (!channel) throw new Error(`Unknown scene bridge channel: ${name}`);
    return channel;
  }

  function createSceneBridge(options = {}) {
    let eventId = 0;
    const now = options.now || (() => performance.now());

    function queue(channelName, type, detail = {}, meta = {}) {
      const channel = getChannel(channelName);
      eventId += 1;
      const event = {
        id: eventId,
        type,
        sceneEvent: meta.sceneEvent || "idle",
        sceneNonce: meta.sceneNonce || 0,
        at: now(),
        detail
      };
      const queueValue = Array.isArray(window[channel.queueKey]) ? window[channel.queueKey] : [];
      queueValue.push(event);
      window[channel.queueKey] = queueValue.slice(-channel.limit);
      window[channel.latestKey] = event;
      return event;
    }

    function setSnapshot(channelName, snapshot) {
      const channel = getChannel(channelName);
      window[channel.snapshotKey] = snapshot;
      return snapshot;
    }

    function getQueue(channelName) {
      const channel = getChannel(channelName);
      return Array.isArray(window[channel.queueKey]) ? window[channel.queueKey] : [];
    }

    function drain(channelName) {
      const channel = getChannel(channelName);
      const events = getQueue(channelName);
      window[channel.queueKey] = [];
      return events;
    }

    function latest(channelName) {
      return window[getChannel(channelName).latestKey] || null;
    }

    function clear(channelName) {
      const channel = getChannel(channelName);
      window[channel.queueKey] = [];
      window[channel.latestKey] = null;
    }

    function clearAll() {
      Object.keys(CHANNELS).forEach(clear);
    }

    return {
      queue,
      setSnapshot,
      getQueue,
      drain,
      latest,
      clear,
      clearAll
    };
  }

  window.KeyPilotSceneBridge = { createSceneBridge };
})();
