export default function(populate = false) {
  const services = ['Check-Overdue', "Sync-Grades", "Assign-Grades"];//This array holds the title of each service.
  const types = [1, 2, 3];// Indicate whether the service references a source and a target.
  const listCourses = function(res, courseCell, courseDiv, service) {
    for (let i = 0; i < res.length; i++) {
      const serviceId = service;
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
    courseCell.attr("colspan", "2");
  }
  const sourceTarget = function(res, courseCell, targetCell, courseDiv, targetDiv, service, id, row) {              
              const serviceId = service;
              const selectTarget = $("<select></select>");
              const selectSource = $("<select></select>");
              selectTarget.attr('name', `${serviceId + "-target"}`);
              targetDiv.append(selectTarget);
              selectSource.attr('name', `${serviceId + "-source"}`);
              courseDiv.append(selectSource);
              selectSource.append($(`<option value = null>Select a course</option>`));
              selectTarget.append($(`<option value = null>Select a course</option>`))
              for (let i = 0; i < res.length; i++) {
                const option = Array.from(Array(2), () => $("<option></option>"));
                option.forEach(e => {
                  e.attr("value", `${res[i].id}`)
                    .text(`${res[i].name} (${res[i].course_code}, ${res[i].id})`);
                });
                selectSource.append(option[0]);
                selectTarget.append(option[1]);
              }
  }
  
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
            const courseCell = $(`<td id=${id}-3></td>`);//Create the cource cell.            
            const courseDiv = $('<div class="container-fluid"></div>');
            row.append(courseCell);
            if (types[j] == 1) {
              listCourses(res, courseCell, courseDiv, services[j]);
            } else if (types[j] == 2) {//Create the cross-reference cell.
              const targetCell = $(`<td id=${id}-4></td>`);
              targetCell.append('<th>Target</th>');
              courseCell.append('<th>Source</th>');
              const targetDiv = $('<div class="container-fluid"></div>');
              targetCell.append(targetDiv);
              row.append(targetCell);
              sourceTarget(res, courseCell, targetCell, courseDiv, targetDiv, services[j], id, row);
              const addButton = $("<button type = 'button' class='btn btn-primary'>Add</button>");
              addButton.on('click', function() {
                sourceTarget(res, courseCell, targetCell, courseDiv, targetDiv, services[j], id, row);
              });
              targetCell.append(addButton);
            }
            courseCell.append(courseDiv);
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

