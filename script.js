const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting",
  "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
  "dragon", "dark", "steel", "fairy"
];

const CHART = {
  normal:   { rock: .5, ghost: 0, steel: .5 },
  fire:     { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
  water:    { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
  electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
  grass:    { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
  ice:      { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
  fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
  poison:   { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
  flying:   { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
  psychic:  { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
  bug:      { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
  rock:     { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: .5 },
  dragon:   { dragon: 2, steel: .5, fairy: 0 },
  dark:     { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
  steel:    { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
  fairy:    { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 }
};

let POKEMON = {};

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function typeImage(type, className = "type-img") {
  return `<img class="${className}" src="data/types/${type}.png" alt="${type}" title="${type}">`;
}

function effectiveness(attackType, defenderTypes) {
  return defenderTypes.reduce(
    (multiplier, defenseType) => multiplier * (CHART[attackType][defenseType] ?? 1),
    1
  );
}

function defensiveProfile(types) {
  return Object.fromEntries(
    TYPES.map((attackType) => [attackType, effectiveness(attackType, types)])
  );
}

function buildPokemonSlots() {
  const container = document.getElementById("slots");
  const pokemonList = Object.values(POKEMON).sort((a, b) => a.dex - b.dex);

  for (let i = 1; i <= 6; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "slot";

    const label = document.createElement("label");
    label.textContent = `Pokémon ${i}`;

    const select = document.createElement("select");
    select.name = `pokemon${i}`;

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— Choose —";
    select.append(blank);

    for (const pokemon of pokemonList) {
      const option = document.createElement("option");
      option.value = pokemon.name.toLowerCase();
      option.textContent = `#${String(pokemon.dex).padStart(4, "0")} ${pokemon.name}`;
      select.append(option);
    }

    label.append(select);
    wrapper.append(label);
    container.append(wrapper);
  }
}

function buildMoveSlots() {
  const container = document.getElementById("move-slots");

  for (let pokemonNumber = 1; pokemonNumber <= 6; pokemonNumber++) {
    const wrapper = document.createElement("div");
    wrapper.className = "move-slot";

    const label = document.createElement("label");
    label.textContent = `Pokémon ${pokemonNumber} move types`;

    const moveInputs = document.createElement("div");
    moveInputs.className = "move-inputs";

    for (let moveNumber = 1; moveNumber <= 4; moveNumber++) {
      const select = document.createElement("select");
      select.name = `move${pokemonNumber}_${moveNumber}`;

      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Move type";
      select.append(blank);

      for (const type of TYPES) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        select.append(option);
      }

      moveInputs.append(select);
    }

    label.append(moveInputs);
    wrapper.append(label);
    container.append(wrapper);
  }
}

function getSelectedTeam() {
  const team = [];

  for (let i = 1; i <= 6; i++) {
    const selectedName = document.forms[0][`pokemon${i}`].value;
    const member = POKEMON[selectedName];

    if (member) team.push(member);
  }

  return team;
}

function getSelectedMoveTypes() {
  const moveTypes = [];

  for (let pokemonNumber = 1; pokemonNumber <= 6; pokemonNumber++) {
    const memberMoves = [];

    for (let moveNumber = 1; moveNumber <= 4; moveNumber++) {
      const selected = document.forms[0][`move${pokemonNumber}_${moveNumber}`].value;

      if (selected) memberMoves.push(selected);
    }

    moveTypes.push(memberMoves);
  }

  return moveTypes;
}

function analyzeDefense(team) {
  const coverage = Object.fromEntries(
    TYPES.map((attackType) => [
      attackType,
      { weak: 0, resist: 0, immune: 0, details: [] }
    ])
  );

  for (const member of team) {
    const profile = defensiveProfile(member.types);

    for (const [attackType, multiplier] of Object.entries(profile)) {
      if (multiplier === 0) {
        coverage[attackType].immune++;
        coverage[attackType].details.push(`${member.name}: immune`);
      } else if (multiplier > 1) {
        coverage[attackType].weak++;
        coverage[attackType].details.push(
          `${member.name}: ${multiplier === 4 ? "4x" : "2x"} weak`
        );
      } else if (multiplier < 1) {
        coverage[attackType].resist++;
        coverage[attackType].details.push(
          `${member.name}: ${multiplier === .25 ? "1/4" : "1/2"} resist`
        );
      }
    }
  }

  return coverage;
}

function analyzeOffense(moveTypes) {
  const coverage = Object.fromEntries(
    TYPES.map((attackType) => [
      attackType,
      {
        users: 0,
        superEffective: [],
        notVeryEffective: [],
        noEffect: []
      }
    ])
  );

  const selectedTypes = new Set(moveTypes.flat());

  for (const attackType of TYPES) {
    coverage[attackType].users = moveTypes.filter(
      (moves) => moves.includes(attackType)
    ).length;

    if (!selectedTypes.has(attackType)) continue;

    for (const defenseType of TYPES) {
      const multiplier = effectiveness(attackType, [defenseType]);

      if (multiplier === 0) {
        coverage[attackType].noEffect.push(defenseType);
      } else if (multiplier > 1) {
        coverage[attackType].superEffective.push(defenseType);
      } else if (multiplier < 1) {
        coverage[attackType].notVeryEffective.push(defenseType);
      }
    }
  }

  return coverage;
}

function renderTeam(team) {
  const teamList = document.getElementById("team-list");
  teamList.innerHTML = "";

  for (const member of team) {
    const card = document.createElement("div");
    card.className = "team-card";

    const img = document.createElement("img");
    img.src = normalizePath(member.img);
    img.alt = member.name;
    img.loading = "lazy";

    const info = document.createElement("div");
    info.innerHTML = `
      <span class="pokemon-name">${member.name}</span>
      <span class="pokemon-dex">#${String(member.dex).padStart(4, "0")}</span>
      <div class="type-row">
        ${member.types.map((type) => typeImage(type)).join("")}
      </div>
    `;

    card.append(img, info);
    teamList.append(card);
  }
}

function renderDefense(team) {
  const tbody = document.getElementById("coverage-body");
  tbody.innerHTML = "";

  const coverage = analyzeDefense(team);

  for (const attackType of TYPES) {
    const data = coverage[attackType];
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><div class="type-cell">${typeImage(attackType)}</div></td>
      <td class="${data.weak >= 3 ? "bad" : ""}">${data.weak}</td>
      <td class="${data.resist >= 3 ? "good" : ""}">${data.resist}</td>
      <td class="${data.immune ? "immune" : ""}">${data.immune}</td>
      <td class="details">${data.details.join(", ") || "—"}</td>
    `;

    tbody.append(row);
  }
}

function renderOffense(moveTypes) {
  const tbody = document.getElementById("offense-body");
  tbody.innerHTML = "";

  const coverage = analyzeOffense(moveTypes);

  for (const attackType of TYPES) {
    const data = coverage[attackType];
    const row = document.createElement("tr");

    const formatTypes = (types) =>
      types.length
        ? types.map((type) => typeImage(type)).join(" ")
        : "—";

    row.innerHTML = `
      <td><div class="type-cell">${typeImage(attackType)}</div></td>
      <td class="${data.users ? "good" : ""}">${data.users}</td>
      <td class="details">${formatTypes(data.superEffective)}</td>
      <td class="details">${formatTypes(data.notVeryEffective)}</td>
      <td class="details">${formatTypes(data.noEffect)}</td>
    `;

    tbody.append(row);
  }
}

document.getElementById("team-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const team = getSelectedTeam();
  const moveTypes = getSelectedMoveTypes();

  document.getElementById("results").hidden = false;

  renderTeam(team);
  renderOffense(moveTypes);
  renderDefense(team);
});

fetch("data/pokemon.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load pokemon.json: HTTP ${response.status}`);
    }

    return response.json();
  })
  .then((data) => {
    POKEMON = data;
    buildPokemonSlots();
    buildMoveSlots();
  })
  .catch((error) => {
    console.error(error);
    alert("Could not load data/pokemon.json. Verify the file path and that it is committed to the repository.");
  });