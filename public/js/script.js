(() => {
  "use strict";

  const forms = document.querySelectorAll(".needs-validation");

  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

document.addEventListener("DOMContentLoaded", function () {
  const successAlert = document.querySelector(".alert-success");

  if (successAlert) {
    setTimeout(() => {
      const alertInstance = new bootstrap.Alert(successAlert);
      alertInstance.close();
    }, 7000);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const noScrollLinks = document.querySelectorAll(".no-scroll");

  noScrollLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
    });
  });
});
