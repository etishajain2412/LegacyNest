const getFrontendUrl = (req) => {
  if (process.env.NODE_ENV === "production") {
    return process.env.FRONTEND_URL_PROD;
  }
  return process.env.FRONTEND_URL_DEV;
};

const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.BACKEND_URL_PROD;
  }
  return process.env.BACKEND_URL_DEV;
};

module.exports = { getFrontendUrl, getBackendUrl };
