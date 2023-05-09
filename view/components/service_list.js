export default function(populate = false) {
  const services = ['Check-Overdue', "Sync-Grades", "Service-3"];//This array holds the title of each service.
  const reference = [false, true, false];// Indicate whether the service references a source and a target.
  if (!populate) {
    const form = $('<form action="/subscribe" method="post" class="invisible"></form>');
    const table = $('<table class="table table-bordered table-striped table-hover"><tr><th>Service</th><th>Subscribe</th><th colspan = "2">Courses</th></tr></table>');//Define the service list table headers.
    form.append(table);
    $('#service-list').append(form);//#service-list is a <div> element in profile.html.

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
          for (let j = 0; j < services.length; j++) {
            const id = services[j];
            const row = $('<tr></tr>');
            table.append(row);//Create a row for each service.
            row.append(
              $(`<td id="${id}-1"></td>`)
                .text(`${services[j].split('-').join(' ')}`)
            );//Define the service title cell.
            row.append(
              $(`<td id="${id}-2"></td>`)
                .html(`<input type="checkbox" name="${id}-sub" style="display: block; margin: auto">`) // Define the subsribe checkbox cell
            )
            const courseCell = $(`<td id=${id}-3></td>`);
            if(reference[j] == true) {
              courseCell.append('<th>Source</th>');
            }
            const courseDiv = $('<div class="container-fluid"></div>');
            courseCell.append(courseDiv);
            row.append(courseCell);//Create the cource cell.
            for (let i = 0; i < res.length; i++) {
              const serviceId = services[j];
              const id = serviceId + '-' + res[i].course_code.split(' ').join('-');
              const label = $('<label></label>');
              label
                .text(`${res[i].name} (${res[i].course_code}, ${res[i].id})`)
                .attr('for', `${id}`)
                .css('margin-left', '30px')
                .css('display', 'inline-block');
              courseDiv.append(
                $('<div></div>')
                  .addClass('checkbox')
                  .addClass(`${res[i].id}`)
                  .append(
                    $('<input>')
                      .attr('id', `${id}`)
                      .attr('type', 'checkbox')
                      .attr('name', `${serviceId}`)
                      .attr('value', `${res[i].id}`)
                      .css('display', 'inline-block')
                      .css('margin-left', '20px')
                  )
                  .append(label)
              );
            };
            if(reference[j] == true) {//Create the "target" cell.
              const courseCell = $(`<td id=${id}-4></td>`);
              courseCell.append('<th>Target</th>');
              const courseDiv = $('<div class="container-fluid"></div>');
              courseCell.append(courseDiv);
              row.append(courseCell);
              const serviceId = services[j] + "-target";
              const select = $("<select></select>");
              select.attr('name', `${serviceId}`);
              courseDiv.append(select);
              for (let i = 0; i < res.length; i++) {                
                const id = serviceId + '-' + res[i].course_code.split(' ').join('-') + "-target";
                const option = $("<option></option>");
                option
                  .attr("value", `${res[i].id}`)
                  .text(`${res[i].name} (${res[i].course_code}, ${res[i].id})`);
                select.append(option);              
              };
            } else {
              $(`#${id}-3`).attr("colspan", "2");
            }
            const deliver = $(`<button type='submit' class='btn btn-primary' formaction='/${id}'>Deliver</button>`);//Use the "formaction" attribute to change the default action of the submit button.
            courseCell.append(deliver);
          };
        };
      });
    return;
  }
  /* To-do List:
  1. Add "source" and "target" table header to the rows accordingly.
  2. Merge the cells where there is no need for cross reference.
  3. Change the checkbox input for cross reference service to dropdown menu. Introduce the 1-1 correspondence.
  */  
  //Start populating from the database
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

  for (let service in currServices) {
    const serviceId = service;
    if (currServices[serviceId].active) {
      $(`#${serviceId}-2`).children('input').attr('checked', true);
      populateCourses(serviceId);
    }
  };
  form.append("<button type='submit' class='btn btn-primary btn-block animate__animated animate__zoomIn' style='margin-top: 12pt; margin-bottom: 12pt'><i class='fas fa-paper-plane'></i> Submit</button>")
  $('form').on('submit', () => {
    sessionStorage.setItem('submitted', 'true');
  })
};

//The subscription state cannot be displayed properly after submitting or refreshing.

