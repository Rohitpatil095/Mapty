"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");

const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

let map,
  mapClickEvent,
  mapZoomLevel = 13;

class Workout {
  id = (Date.now() + "").slice(-10);
  date = new Date();
  description = "";
  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, codence) {
    super(distance, duration, coords);
    this.codence = codence;
    this.calPace();
    this.setDescription();
  }

  calPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calSpeed();
    this.setDescription();
  }

  calSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// FOR TESTING ONLY
// let run=new Running([12,-23],23,54,645);
// let cyc=new Cycling([23,-54],45,5,6);
// console.log(run,cyc);

/// main APPLICATION ARCHITECTURE
class App {
  #map;
  #mapClickEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);

    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Control") {
        document.addEventListener("keydown", (es) => {
          if (es.key === "Delete") {
            this._resetLocaldata();
          }
        });
      }
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          // if error
          alert("Grant permissions for app working..");
        }
      );
    }
  }

  _loadMap(position) {
    // if success
    const currCordinates = [
      position.coords.latitude,
      position.coords.longitude,
    ];
    this.#map = L.map("map").setView(currCordinates, mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showform.bind(this));

    this.#workouts.forEach((workout) => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showform(mapClickE) {
    this.#mapClickEvent = mapClickE;
    inputDistance.focus();
    form.classList.remove("hidden");
  }

  _hideForm = () => {
    this._clearUserInputs();
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  };

  _clearUserInputs = () => {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";
  };

  _toggleElevationField(e) {
    this._clearUserInputs();
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    const { lat, lng } = this.#mapClickEvent.latlng;
    let workout = [];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const isNums = (...nums) => nums.every((num) => Number.isFinite(num));
    const isPositive = (...nums) => nums.every((num) => num > 0);

    if (type === "running") {
      // perform data validation
      const cadence = +inputCadence.value;
      if (
        !isNums(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence)
      ) {
        alert("Need valid Inputs..");
        return;
      }

      // create workout for running
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (inputType.value === "cycling") {
      const elevation = +inputElevation.value;
      if (!isNums(distance, duration) || !isPositive(distance, duration)) {
        alert("Need valid Inputs..");
        return;
      }
      // create workout for cycling
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    // distance, duration, cadence

    let html = `
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type == "running") {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.codence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    } else if (workout.type == "cycling") {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    // find closest workout obj in ul
    const workoutElement = e.target.closest(".workout");

    if (!workoutElement) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutElement.dataset.id
    );

    this.#map.setView(workout.coords, mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const workOutsLocalStorageData = JSON.parse(
      localStorage.getItem("workouts")
    );

    if (!workOutsLocalStorageData) return;

    this.#workouts = workOutsLocalStorageData;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  _resetLocaldata() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
