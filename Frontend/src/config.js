const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
const WS_BASE  = API_BASE.replace("https://", "wss://").replace("http://", "ws://");

export { API_BASE, WS_BASE };