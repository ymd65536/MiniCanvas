const button = document.querySelector("#increment");
const counter = document.querySelector("#counter");
const status = document.querySelector("#status");

if (!button || !counter || !status) {
    throw new Error("Minimum Canvas is missing its counter controls");
}

let count = 0;
button.addEventListener("click", () => {
    count += 1;
    counter.textContent = String(count);
});
status.textContent = "JavaScript is ready. Click the button to test it.";
button.disabled = false;
