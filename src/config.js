require('dotenv').config();
const myEnv = Object.create(process.env);
const tokenName = 'CANVAS_API_TOKEN' + myEnv.ENVIRONMENT; 
const myToken = myEnv[tokenName];
const myHeaders = {
  Authorization: `Bearer ${myToken}`,
  Accept: "application/json+canvas-string-ids"
}
const generateBaseUrl = () => {
  const currEnvironment = myEnv.ENVIRONMENT.slice(1);
  console.log(currEnvironment);
  if (/production/i.test(currEnvironment)) {
    return 'https://canvas.instructure.com';
  } else {
    return 'https://canvas.' + currEnvironment.toLowerCase() + '.instructure.com';
  }
}

module.exports = {
  myHeaders: myHeaders,
  generateBaseUrl: generateBaseUrl
}