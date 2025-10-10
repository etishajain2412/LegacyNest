
const online = new Map();
let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  return ioInstance;
}

function register(userId, socketId) {
  if (!userId || !socketId) return;
  online.set(String(userId), socketId);
}

function unregisterBySocket(socketId) {
  for (const [uid, sid] of online.entries()) {
    if (sid === socketId) {
      online.delete(uid);
      break;
    }
  }
}

function getSocketId(userId) {
  return online.get(String(userId));
}

function getOnlineMap() {
  return online;
}

module.exports = {
  setIo,
  getIo,
  register,
  unregisterBySocket,
  getSocketId,
  getOnlineMap,
};
