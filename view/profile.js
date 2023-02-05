//The functionality of this file has been migrated to the various components.
$(document).ready(function(){
  const services = ['Check overdue', "Service-2", "Service-3"];
  const form = $('<form class="invisible"></form>');
  const table = $('<table class="table table-bordered table-striped table-hover"><tr><th>Service</th><th>Subscription</th><th>Courses</th></tr></table>');
  form.append(table);
  $('#service-list').append(form);

  //Print the greeting message
  fetch('/user')
    .then(res => res.json())
    .then(profile => {
      $('#greeting').addClass('animate__animated animate__slideInRight');
      if (profile.name) {
        if(profile.returning) {
          const lastLogin = new Date(profile.lastLogin);
          $('#greeting').html(`Welcome back, ${profile.name}. Your last login time was ${lastLogin.toUTCString()}.`);
        } else {
          $('#greeting').html(`Welcome, ${profile.name}. This is your first login.`)
        }
        $('#greeting').append(` You are in the ${profile.envir} environment.`);
      } else {
        $('#greeting').html("Sorry, cannot retrieve your profile. Please check your input. Also, make sure your access token has not expired or changed. <br> <span class='text-danger'>" + profile + "</span> <br> Redirect to the homepage after 10 seconds.");
        setTimeout(() => window.location.replace("/"), 10000);
      }
    });
  
  //Construct the service list
  fetch('/courses')
    .then(res => res.json())
    .then(res => {
      form.removeClass('invisible');
      table.addClass('animate__animated animate__fadeInUpBig');
      for(let j = 0; j < services.length; j++) {
        const id = services[j].split(' ').join('-');
        const row = $('<tr></tr>');
        table.append(row);
        row.append(
          $(`<td id="${id}-1"></td>`)
          .text(`${services[j]}`)
        );
        row.append(
          $(`<td id="${id}-2"></td>`)
          .html(`
          <label for="${id}-yes" class="radio-inline"><input id="${id}-yes" type="radio" name="${id}-sub" value='true'>Yes</label>
          <label for="${id}-no" class="radio-inline"><input id="${id}-no" type="radio" name="${id}-sub" value="false">No</label>
          `)
        )
        const courseCell = $(`<td id=${id}-3></td>`);        
        const courseDiv = $('<div class="container-fluid"></div>');
        courseCell.append(courseDiv);
        row.append(courseCell);
        for(let i = 0; i < res.length; i++) {        
          const id = services[j].split(' ').join('-') + '-' + res[i].course_code.split(' ').join('-');//include the service in the id
          const label = $('<label></label>');      
          label
            .text(`${res[i].name} (${res[i].course_code})`)
            .attr('for', `${id}`)
            .css('margin-left','30px')
          courseDiv.append(
            $('<div></div>')
            .addClass('checkbox')
            .append(
              $('<input>')
              .attr('id', `${id}`)
              .attr('type','checkbox')
              .css('margin-left','20px')              
            )
            .append(label)
          );    
        };
      }      
    });
});

