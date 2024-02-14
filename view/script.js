$(document).ready(function () {
  console.log("script");
  if (localStorage.getItem("envir")) {
    $("#" + localStorage.getItem("envir")).attr("checked", true);
  } else {
    $("#test").attr("checked", true);
  }
  if ($("#test").attr("checked")) {
    fetch("/pass", {
      method: "POST",
    })
      .then((token) => token.json())
      .then((token) => $("#token").val(token));
  }
  localStorage.removeItem("envir");
  $("form").on("submit", (e) => {
    e.preventDefault();
    for (let envir of $(".envir")) {
      if (envir.checked) {
        localStorage.setItem("envir", envir.id);
      }
    }
    $("#primary").addClass("animate__animated animate__slideOutLeft");
    $("#primary").on("animationend", (e) =>
      e.target.firstElementChild.submit(),
    );
  });
});
