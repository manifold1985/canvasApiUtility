export default function(populate = false) {
  const services = ['Check-Overdue', "Sync-Grades", "Assign-Grades", "Create-Peer-Graded", 'Process-Peer-Graded'];
  const types = [1, 2, 3, 4, 1];
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
  const makeCourseMenu = function(res, div, service, suffix = '') {
    const serviceId = service;
    const select = $("<select></select>");
    select.attr('name', `${serviceId + suffix}`);
    select.attr('id', `${serviceId + suffix}`);
    div.append(select);
    select.append($(`<option value = null>Select a course</option>`));
    for (let i = 0; i < res.length; i++) {
      const option = $("<option></option>");
      option
        .attr("value", `${res[i].id}`)
        .text(`${res[i].name} (${res[i].course_code}, ${res[i].id})`);
      select.append(option);
    }
    return select;
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
            const courseDiv = $('<div class="container-fluid"></div>');//Create the course div.
            courseCell.append(courseDiv);
            row.append(courseCell);
            if (types[j] == 1) {
              listCourses(res, courseCell, courseDiv, services[j]);
            } else if (types[j] == 2) {//Create the cross-reference cell.
              const targetCell = $(`<td id=${id}-4></td>`);
              targetCell.append('<th>Target</th>');
              courseCell.prepend('<th>Source</th>');
              const targetDiv = $('<div class="container-fluid"></div>');
              targetCell.append(targetDiv);
              row.append(targetCell);
              makeCourseMenu(res, courseDiv, services[j], '-source');
              makeCourseMenu(res, targetDiv, services[j], '-target');
              const addButton = $("<button type = 'button' class='btn btn-primary'>Add</button>");
              addButton.on('click', function() {
                makeCourseMenu(res, courseDiv, services[j], '-source');
                makeCourseMenu(res, targetDiv, services[j], '-target');
              });
              targetCell.append(addButton);
            } else if (types[j] == 3) {
              const groupCell = $(`<td id = ${id}-4></td>`)
              const selectGroup = $('<select></select>');
              selectGroup.attr('name', `${services[j]}-groups`);
              groupCell.append(selectGroup);
              row.append(groupCell);
              const selectCourse = makeCourseMenu(res, courseDiv, services[j], '-courses');
              const selectId = selectCourse.attr("id");
              $(`#${selectId} > option`)
                .filter(function() {
                  return this.value == "null";
                }).on('click', function() {
                  selectGroup.empty();
                })
              $(`#${selectId} > option`)
                .filter(function() {
                  return this.value != "null";
                })
                .on('click', function(e) {
                  fetch('/groups', {
                    method: "POST",
                    headers: {
                      'Content-Type': 'text/plain'
                    },
                    body: e.currentTarget.value
                  }).then(response => response.json())
                    .then(response => {
                      selectGroup.empty();
                      selectGroup.append('<option value="null">Select a group</option>');
                      response.forEach(group => {
                        selectGroup.append($(`<option value=${group.id}>${group.name}</option>`));
                      });
                    });
                });
            } else if (types[j] == 4) {
              makeCourseMenu(res, courseDiv, services[j], '-course');
              const infoCell = $(`<td id=${id}-4></td>`);
              const infoDiv = $('<div class="container-fluid"></div>');
              row.append(infoCell);
              infoCell.append(infoDiv);
              const options = ['name', 'group'];
              const optionLen = options.length;
              const labels = Array(optionLen).fill();
              const inputs = Array(optionLen).fill();

              const ids = Array(optionLen).fill();
              for (let q = 0; q < optionLen; q++) {
                const inputType = 'text';
                console.log(inputType);
                ids[q] = services[j] + '-' + options[q];
                labels[q] = $('<label></label>');
                labels[q]
                  .text(options[q])
                  .attr('for', ids[q])
                inputs[q] = $('<input></input>');
                inputs[q]
                  .attr('id', ids[q])
                  .attr('type', inputType)
                  .attr('name', ids[q]);
                infoDiv
                  .append(labels[q])
                  .append(inputs[q]);
              }
            }
            const deliver = $(`<button type='submit' class='btn btn-primary' formaction='/${id}'>Deliver</button>`);
            courseCell.append(deliver);
          };
        };
      });
    return;
  }

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

