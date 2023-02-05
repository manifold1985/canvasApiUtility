export default profile => {
  if (sessionStorage.getItem('submitted') === 'true') {
    $('#greeting').addClass('animate__animated animate__flip');
    $('#greeting').html(`Thank you for subscribing. Have a nice day, ${profile.name}!`);
    sessionStorage.removeItem('submitted');
    return;
  }
  
  $('#greeting').addClass('animate__animated animate__slideInRight');
  if (profile.name) {
    if(profile.returning) {
      const lastLogin = new Date(profile.lastLogin);
      $('#greeting').html(`Welcome back, ${profile.name}. Your last login time was ${lastLogin.toLocaleString('en-US',{timeZone: 'America/New_York'})}.`);
    } else {
      $('#greeting').html(`Welcome, ${profile.name}. This is your first login.`)
    }
    $('#greeting').append(` You are in the ${profile.envir} environment. Please pick your services.`);
  } else {
    $('#greeting').html("Sorry, cannot retrieve your profile. Please check your input. Also, make sure your access token has not expired or changed. <br> <span class='text-danger'>" + profile + "</span> <br> Redirect to the homepage after 10 seconds.");
    setTimeout(() => window.location.replace("/"), 10000);
  }
};
