import { getServerConfig, getRTCConfiguration } from "./config";
import { createDisplayStringArray }                from "./stats";
import { VideoPlayer }                             from "./videoplayer";
import { RenderStreaming }                         from "./renderstreaming";
import { Signaling, WebSocketSignaling }            from "./signaling";

let playButton;
let renderstreaming;
let useWebSocket;
let lastStats = null;
let intervalId = null;

export async function setup() {
  // --- DOM 요소 조회 ---
  const codecPreferences    = document.getElementById("codecPreferences");
  const messageDiv          = document.getElementById("message");
  const playerDiv           = document.getElementById("player");
  const lockMouseCheck      = document.getElementById("lockMouseCheck");
  const warningDiv          = document.getElementById("warning");

  // 화면 초기화
  if (messageDiv) messageDiv.style.display = "none";
  if (warningDiv) warningDiv.hidden = true;

  // VideoPlayer 인스턴스 생성
  const videoPlayer = new VideoPlayer();

  // --- 서버 설정 불러오기 & 옵션 세팅 ---
  const res = await getServerConfig();
  useWebSocket = res.useWebSocket;

  // private 모드 경고
  if (res.startupMode === "private" && warningDiv) {
    warningDiv.innerHTML = "<h4>Warning</h4> This sample is not working on Private Mode.";
    warningDiv.hidden = false;
  }

  // 코덱 선택 옵션 채우기
  const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
    "setCodecPreferences" in window.RTCRtpTransceiver.prototype;
  if (supportsSetCodecPreferences && codecPreferences) {
    const codecs = RTCRtpSender.getCapabilities("video").codecs;
    codecs.forEach(codec => {
      if (["video/red","video/ulpfec","video/rtx"].includes(codec.mimeType))
        return;
      const option = document.createElement("option");
      option.value     = `${codec.mimeType} ${codec.sdpFmtpLine||""}`.trim();
      option.innerText = option.value;
      codecPreferences.appendChild(option);
    });
    codecPreferences.disabled = false;
  }

  // 플레이 버튼 보이기
  if (!document.getElementById("playButton")) {
    const elementPlayButton = document.createElement('img');
    elementPlayButton.id = 'playButton';
    elementPlayButton.src = '../images/Play.png';
    elementPlayButton.alt = 'Start Streaming';
    playButton = document.getElementById('player').appendChild(elementPlayButton);
    playButton.addEventListener('click', onClickPlayButton);
  }

  // --- 전역 이벤트 바인딩 ---
  // 우클릭 메뉴 비활성화
  window.document.oncontextmenu = () => false;

  // 창 크기 변경 시 비디오 리사이즈
  window.addEventListener("resize", () => {
    videoPlayer.resizeVideo();
  }, true);

  // 페이지 떠날 때 스트리밍 정리
  window.addEventListener("beforeunload", async () => {
    if (renderstreaming) {
      await renderstreaming.stop();
    }
  }, true);

  // --- 내부 함수들 ---
  function onClickPlayButton() {
    if (playButton) playButton.style.display = "none";
    videoPlayer.createPlayer(playerDiv, lockMouseCheck);
    setupRenderStreaming();
  }

  async function setupRenderStreaming() {
    if (codecPreferences) codecPreferences.disabled = true;

    const signaling = useWebSocket
      ? new WebSocketSignaling()
      : new Signaling();
    const config = getRTCConfiguration();
    renderstreaming = new RenderStreaming(signaling, config);

    renderstreaming.onConnect    = onConnect;
    renderstreaming.onDisconnect = onDisconnect;
    renderstreaming.onTrackEvent = ({ track }) => videoPlayer.addTrack(track);
    renderstreaming.onGotOffer   = setCodecPreferences;

    await renderstreaming.start();
    await renderstreaming.createConnection();
  }

  function onConnect() {
    const channel = renderstreaming.createDataChannel("input");
    videoPlayer.setupInput(channel);
    showStatsMessage();
  }

  async function onDisconnect(connectionId) {
    clearStatsMessage();
    if (messageDiv) {
      messageDiv.style.display = "block";
      messageDiv.innerText = `Disconnect peer on ${connectionId}.`;
    }
    await renderstreaming.stop();
    renderstreaming = null;
    videoPlayer.deletePlayer();
    if (codecPreferences && supportsSetCodecPreferences) {
      codecPreferences.disabled = false;
    }
  }

  function setCodecPreferences() {
    let selectedCodecs = null;
    if (supportsSetCodecPreferences && codecPreferences) {
      const sel = codecPreferences.options[codecPreferences.selectedIndex];
      if (sel.value !== "") {
        const [mimeType, sdpFmtp] = sel.value.split(" ");
        const { codecs } = RTCRtpSender.getCapabilities("video");
        const idx = codecs.findIndex(c => c.mimeType===mimeType && c.sdpFmtpLine===sdpFmtp);
        if (idx >= 0) selectedCodecs = [codecs[idx]];
      }
    }
    if (!selectedCodecs) return;
    const transceivers = renderstreaming
      .getTransceivers()
      .filter(t => t.receiver.track.kind === "video");
    transceivers.forEach(t => t.setCodecPreferences(selectedCodecs));
  }

  function showStatsMessage() {
    intervalId = setInterval(async () => {
      if (!renderstreaming) return;
      const stats = await renderstreaming.getStats();
      if (!stats) return;
      const arr = createDisplayStringArray(stats, lastStats);
      if (arr.length && messageDiv) {
        messageDiv.style.display = "block";
        messageDiv.innerHTML = arr.join("<br>");
      }
      lastStats = stats;
    }, 1000);
  }

  function clearStatsMessage() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      lastStats = null;
    }
    if (messageDiv) {
      messageDiv.style.display = "none";
      messageDiv.innerHTML = "";
    }
  }
}
