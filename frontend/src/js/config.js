import {getServers} from "./icesettings.js";

export async function getServerConfig() {
  const protocolEndPoint = '/config';
  try {
    const createResponse = await fetch(protocolEndPoint);
    return await createResponse.json();
  } catch (error) {
    console.warn('Could not get server config, using defaults:', error);
    return {
      useWebSocket: true,
      startupMode: 'public'
    };
  }
}

export function getRTCConfiguration() {
  let config = {};
  config.sdpSemantics = 'unified-plan';
  config.iceServers = getServers();
  return config;
}
