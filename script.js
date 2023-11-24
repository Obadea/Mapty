'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + ' ').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lan, lng]
    this.distance = distance; //in KM
    this.duration = duration; // in min
  }

  setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on  ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }

  calcPace() {
    // Min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    //Km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178~);
// const cycling1 = new Cycling([39, -12], 27, 95, 525);
// console.log(run1, cycling1);

/////////////////////////////////////////////////////////
// Note://APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteBtn = document.querySelectorAll('.delete--workout-btn');

// const deleteBtn = document.querySelector('.delete--workout-btn');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  _workouts = [];
  constructor() {
    // Get user's Position
    this.#getPosition();
    // Get data from local Storage
    this.#getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this.#newWorkout.bind(this));
    ///note:
    //////
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
    form.addEventListener('submit', this.deleteWorkout.bind(this));

    // deleworkout
    this.deleteWorkout();
  }

  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this.#showForm.bind(this));

    // Render Markers
    this._workouts.forEach(work => {
      this.#renderWorkoutMarker(work);
    });
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #hideForm() {
    //Empty Inputs
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkout(e) {
    //note:todays work(October,9,2023);

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositives = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)

        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      )
        return alert('input have to be positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositives(distance, duration)
      )
        return alert('input have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this._workouts.push(workout);

    // Render workout on map as marker
    this.#renderWorkoutMarker(workout);

    // Render workout on list
    this.#renderWorkout(workout);

    // Hide the form and Clear input fields
    this.#hideForm();

    // Set localStorage to all workout
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
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
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}
        <div class="delete--workout-btn" data-id="${workout.id}">&times;</div>
        </h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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

    if (workout.type === `running`)
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
    `;

    if (workout.type === `cycling`)
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
        </li>
    `;
    form.insertAdjacentHTML('afterend', html);
  }

  #moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this._workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // //////////////////////note:////////
  deleteWorkout() {
    const deleteBtn = document.querySelectorAll('.delete--workout-btn');
    // this.#map.remove();
    deleteBtn.forEach(el => {
      el.addEventListener(
        'click',
        function () {
          // note:
          if (!el) return;

          const workout = this._workouts.find(
            work => work.id === el.dataset.id
          );

          this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
              duration: 0.1,
            },
          });
          // note:

          // console.log(el);
          const workoutContainer = document.querySelectorAll('.workout');

          workoutContainer.forEach((cel, i) => {
            if (el.dataset.id === cel.dataset.id) {
              const index = Math.abs(i - this._workouts.length + 1);

              this._workouts.splice(index, 1);

              this.#setLocalStorage();

              this.getLocalStorageAfterDelete();

              location.reload();
            }
          });
        }.bind(this)
      );
    });
  }
  // ///////////////////////

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this._workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this._workouts = data;

    this.#rebuildObject();

    this._workouts.forEach(work => {
      this.#renderWorkout(work);
    });

    console.log(this._workouts);
  }

  #rebuildObject() {
    this._workouts.forEach(obj => {
      if (obj.type === 'running') {
        Object.setPrototypeOf(obj, Running.prototype);
      } else {
        Object.setPrototypeOf(obj, Cycling.prototype);
      }
    });
  }

  getLocalStorageAfterDelete() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this._workouts = data;

    // containerWorkouts.textContent = '';

    // this.#rebuildObject();

    // console.log(this._workouts);

    // console.log(this._workouts);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
document.querySelector('#currentYear').textContent = new Date().getFullYear();

// const getTotalBtn = function () {
//   const deleteBtn = document.querySelectorAll('.delete--workout-btn');

//   deleteBtn.forEach(el => {
//     el.addEventListener('click', function (e) {
//       console.log(el);
//       // NOte:

//     });
//   });
// };

// getTotalBtn();

// localStorage.removeItem('workouts');
