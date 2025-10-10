// const getFrontendUrl = (req) => {
// //   const origin = req.headers.origin || '';
// //   if (origin.includes('localhost')) return process.env.FRONTEND_URL_DEV;
    
//   return process.env.FRONTEND_URL_DEV;
// };

const getBackendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL_PROD;
  }
  return process.env.BACKEND_URL_DEV;
};

module.exports = {getBackendUrl };
