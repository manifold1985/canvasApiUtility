export default function(populate=false) {
  const services = ['Check-Overdue', "Service-2", "Service-3"];
  if (!populate) {
    const form = $('<form action="/subscribe" method="post" class="invisible"></form>');
    const table = $('<table class="table table-bordered table-striped table-hover"><tr><th>Service</th><th>Subscription</th><th>Courses</th></tr></table>');
    form.append(table);
    $('#service-list').append(form);
    
    fetch('/courses')
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          return null;
        }
      })
      .then(res => {
        if (res) {
          form.removeClass('invisible');
          table.addClass('animate__animated animate__fadeInUpBig');
          for(let j = 0; j < services.length; j++) {
            const id = services[j];
            const row = $('<tr></tr>');
            table.append(row);
            row.append(
              $(`<td id="${id}-1"></td>`)
              .text(`${services[j].split('-').join(' ')}`)
            );
            row.append(
              $(`<td id="${id}-2"></td>`)
              .html(`<input type="checkbox" name="${id}-sub" style="display: block;margin: auto">`)
            )
            const courseCell = $(`<td id=${id}-3></td>`);        
            const courseDiv = $('<div class="container-fluid"></div>');
            courseCell.append(courseDiv);
            row.append(courseCell);
            for(let i = 0; i < res.length; i++) {
              const serviceId = services[j];
              const id = serviceId + '-' + res[i].course_code.split(' ').join('-');
              const label = $('<label></label>');      
              label
                .text(`${res[i].name} (${res[i].course_code}, ${res[i].id})`)
                .attr('for', `${id}`)
                .css('margin-left','30px')
                .css('display','inline-block');
              courseDiv.append(
                $('<div></div>')
                .addClass('checkbox')
                .addClass(`${res[i].id}`)
                .append(
                  $('<input>')
                  .attr('id', `${id}`)
                  .attr('type','checkbox')
                  .attr('name',`${serviceId}`)
                  .attr('value',`${res[i].id}`)
                  .css('display','inline-block')
                  .css('margin-left','20px')              
                )
                .append(label)
              );    
            };
          }
        }        
      });
    return;
  }
  //Start populating
  const form = $('form');
  const table = $('table');
  const profile = JSON.parse(sessionStorage.getItem('profile'));
  const currServices = profile.services;
  const populateCourses = function(serviceId) {
    currServices[serviceId].courses.forEach(id => {
      $(`#${serviceId}-3`)
        .children('div')
        .children(`.${id}`)
        .children('input')
        .attr('checked', true);
      });    
  }

  for(let service in currServices) {
    const serviceId = service;
    if (currServices[serviceId].active) {
      $(`#${serviceId}-2`).children('input').attr('checked',true);
      populateCourses(serviceId);
    } 
  };
  form.append("<button type='submit' class='btn btn-primary btn-block animate__animated animate__zoomIn' style='margin-top: 12pt; margin-bottom: 12pt'><i class='fas fa-paper-plane'></i> Submit</button>") 
  $('form').on('submit', () => {
    sessionStorage.setItem('submitted', 'true');
  })
};



