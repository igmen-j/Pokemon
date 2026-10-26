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
let pokemonList = [];

const selectedTeam = Array(6).fill(null);
const slotControls = [];

const form = document.getElementById("team-form");
const status = document.getElementById("status");
const results = document.getElementById("results");

function normalizePath(path = "") {
  return path.replaceAll("\\", "/");
}

function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createSprite(pokemon, className) {
  const image = document.createElement("img");
  image.className = className;
  image.src = normalizePath(pokemon.img);
  image.alt = pokemon.name;

  image.addEventListener("error", () => {
    image.style.visibility = "hidden";
  }, { once: true });

  return image;
}

function createTypeImage(type) {
  const image = document.createElement("img");
  image.className = "type-img";
  image.src = `data/types/${type}.png`;
  image.alt = type;
  image.title = type;
  return image;
}

function effectiveness(attackType, defenderTypes) {
  return defenderTypes.reduce(
    (total, defenseType) =>
      total * (CHART[attackType][defenseType] ?? 1),
    1
  );
}

function closeSuggestions(control) {
  control.list.hidden = true;
  control.input.setAttribute("aria-expanded", "false");
  control.input.removeAttribute("aria-activedescendant");
  control.activeIndex = -1;
}

function closeAllSuggestions() {
  slotControls.forEach(closeSuggestions);
}

function setActiveSuggestion(control, index) {
  const options = [...control.list.querySelectorAll('[role="option"]')];

  if (!options.length) return;

  control.activeIndex = (index + options.length) % options.length;

  options.forEach((option, optionIndex) => {
    const active = optionIndex === control.activeIndex;
    option.classList.toggle("active", active);
    option.setAttribute("aria-selected", String(active));
  });

  const activeOption = options[control.activeIndex];

  control.input.setAttribute(
    "aria-activedescendant",
    activeOption.id
  );

  activeOption.scrollIntoView({ block: "nearest" });
}

function renderPreview(index) {
  const control = slotControls[index];
  const pokemon = selectedTeam[index];

  control.preview.replaceChildren();

  if (!pokemon) {
    const text = document.createElement("span");
    text.className = "empty-preview";
    text.textContent = "No Pokémon selected";
    control.preview.append(text);
    return;
  }

  const info = document.createElement("div");

  const name = document.createElement("span");
  name.className = "preview-name";
  name.textContent = pokemon.name;

  const types = document.createElement("div");
  types.className = "type-row";

  pokemon.types.forEach(type => {
    types.append(createTypeImage(type));
  });

  info.append(name, types);

  control.preview.append(
    createSprite(pokemon, "preview-sprite"),
    info
  );
}

function selectPokemon(index, pokemon) {
  const control = slotControls[index];

  selectedTeam[index] = pokemon;
  control.input.value = pokemon.name;
  control.input.setCustomValidity("");
  control.input.removeAttribute("aria-invalid");

  closeSuggestions(control);
  renderPreview(index);

  if (!results.hidden) renderCoverage();
}

function filterPokemon(query) {
  const search = normalizeSearch(query);

  if (!search) return pokemonList;

  const numberSearch = search.replace(/^#/, "");

  return pokemonList.filter(pokemon => {
    const nameMatches =
      normalizeSearch(pokemon.name).includes(search) ||
      normalizeSearch(pokemon.key).includes(search);

    const dexMatches =
      /^\d+$/.test(numberSearch) &&
      (
        String(pokemon.dex).startsWith(numberSearch) ||
        String(pokemon.dex)
          .padStart(3, "0")
          .startsWith(numberSearch) ||
        String(pokemon.dex)
          .padStart(4, "0")
          .startsWith(numberSearch)
      );

    return nameMatches || dexMatches;
  });
}

function showSuggestions(index) {
  const control = slotControls[index];

  slotControls.forEach(other => {
    if (other !== control) closeSuggestions(other);
  });

  control.matches = filterPokemon(control.input.value);
  control.activeIndex = -1;
  control.input.removeAttribute("aria-activedescendant");
  control.list.replaceChildren();

  if (!control.matches.length) {
    const item = document.createElement("li");
    item.className = "no-results";
    item.setAttribute("role", "presentation");
    item.textContent = "No Pokémon found";
    control.list.append(item);
  }

  control.matches.forEach((pokemon, matchIndex) => {
    const item = document.createElement("li");
    item.id = `slot-${index}-result-${matchIndex}`;
    item.className = "suggestion";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");

    const info = document.createElement("div");
    info.className = "suggestion-info";

    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = pokemon.name;

    const dex = document.createElement("span");
    dex.className = "suggestion-dex";
    dex.textContent = `#${String(pokemon.dex).padStart(3, "0")}`;

    info.append(name, dex);

    item.append(
      createSprite(pokemon, "suggestion-sprite"),
      info
    );

    // Keep focus on the search input when choosing a result.
    item.addEventListener("mousedown", event => {
      event.preventDefault();
    });

    item.addEventListener("click", () => {
      selectPokemon(index, pokemon);
    });

    control.list.append(item);
  });

  control.list.hidden = false;
  control.input.setAttribute("aria-expanded", "true");
}

function buildPokemonSearch() {
  const container = document.getElementById("slots");
  container.replaceChildren();

  for (let index = 0; index < 6; index++) {
    const wrapper = document.createElement("div");
    wrapper.className = "slot";

    const label = document.createElement("label");
    label.htmlFor = `pokemon-${index}`;
    label.textContent = `Pokémon ${index + 1}`;

    const searchWrapper = document.createElement("div");
    searchWrapper.className = "search-wrapper";

    const input = document.createElement("input");
    input.id = `pokemon-${index}`;
    input.className = "search-input";
    input.type = "text";
    input.placeholder = "Search name or dex number…";
    input.autocomplete = "off";
    input.spellcheck = false;

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", `suggestions-${index}`);

    const list = document.createElement("ul");
    list.id = `suggestions-${index}`;
    list.className = "suggestions";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", `Pokémon ${index + 1} suggestions`);
    list.hidden = true;

    const preview = document.createElement("div");
    preview.className = "slot-preview";

    const control = {
      wrapper,
      input,
      list,
      preview,
      matches: [],
      activeIndex: -1
    };

    slotControls.push(control);

    input.addEventListener("input", () => {
      selectedTeam[index] = null;
      input.setCustomValidity("");
      input.removeAttribute("aria-invalid");

      renderPreview(index);
      showSuggestions(index);

      if (!results.hidden) renderCoverage();
    });

    input.addEventListener("focus", () => {
      showSuggestions(index);
    });

    input.addEventListener("blur", () => {
      closeSuggestions(control);
    });

    input.addEventListener("keydown", event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        if (list.hidden) showSuggestions(index);

        const nextIndex = event.key === "ArrowDown"
          ? control.activeIndex + 1
          : control.activeIndex < 0
            ? control.matches.length - 1
            : control.activeIndex - 1;

        setActiveSuggestion(control, nextIndex);
      }

      if (event.key === "Enter" && !list.hidden) {
        event.preventDefault();

        const match = control.matches[
          control.activeIndex >= 0 ? control.activeIndex : 0
        ];

        if (match) selectPokemon(index, match);
      }

      if (event.key === "Escape") {
        closeSuggestions(control);
      }
    });

    searchWrapper.append(input, list);
    wrapper.append(label, searchWrapper, preview);
    container.append(wrapper);

    renderPreview(index);
  }
}

function createMatchupCell(multiplier, pokemonName, attackType) {
  const cell = document.createElement("td");

  if (multiplier === null) {
    cell.setAttribute("aria-label", "Empty team slot");
    return cell;
  }

  cell.title =
    `${pokemonName}: ${multiplier}× damage from ${attackType}`;

  if (multiplier === 1) {
    cell.setAttribute("aria-label", "1× normal damage");
    return cell;
  }

  const badge = document.createElement("span");
  badge.className = "matchup";

  const styles = {
    0: ["immune", "immune"],
    0.25: ["resist-quarter", "¼"],
    0.5: ["resist-half", "½"],
    2: ["weak-two", "2×"],
    4: ["weak-four", "4×"]
  };

  const [className, label] = styles[multiplier];

  badge.classList.add(className);
  badge.textContent = label;

  cell.append(badge);
  return cell;
}

function createTotalCell(count, kind) {
  const cell = document.createElement("td");

  cell.className = `total total-${kind}`;
  cell.textContent = count || "";

  if (count > 0) {
    cell.classList.add(`level-${Math.min(count, 3)}`);
  }

  cell.setAttribute(
    "aria-label",
    `${count} Pokémon ${kind === "weak" ? "weak" : "resistant or immune"}`
  );

  return cell;
}

function renderCoverage() {
  const head = document.getElementById("coverage-head");
  const body = document.getElementById("coverage-body");

  head.replaceChildren();
  body.replaceChildren();

  const headerRow = document.createElement("tr");

  const moveHeader = document.createElement("th");
  moveHeader.scope = "col";
  moveHeader.className = "move-header";
  moveHeader.textContent = "Move ↓";
  headerRow.append(moveHeader);

  selectedTeam.forEach((pokemon, index) => {
    const header = document.createElement("th");
    header.scope = "col";

    if (pokemon) {
      header.append(createSprite(pokemon, "header-sprite"));
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "empty-header";
      placeholder.textContent = "—";
      header.append(placeholder);
    }

    const name = document.createElement("span");
    name.className = "header-name";
    name.textContent = pokemon ? pokemon.name : `Slot ${index + 1}`;

    header.append(name);
    headerRow.append(header);
  });

  ["Total Weak", "Total Resist"].forEach(text => {
    const header = document.createElement("th");
    header.scope = "col";
    header.className = "total-header";
    header.textContent = text;
    headerRow.append(header);
  });

  head.append(headerRow);

  TYPES.forEach(attackType => {
    const row = document.createElement("tr");

    const typeHeader = document.createElement("th");
    typeHeader.scope = "row";
    typeHeader.className = "type-heading";
    typeHeader.append(createTypeImage(attackType));
    row.append(typeHeader);

    let weakCount = 0;
    let resistCount = 0;

    selectedTeam.forEach(pokemon => {
      const multiplier = pokemon
        ? effectiveness(attackType, pokemon.types)
        : null;

      if (multiplier !== null) {
        if (multiplier > 1) weakCount++;
        if (multiplier < 1) resistCount++;
      }

      row.append(
        createMatchupCell(
          multiplier,
          pokemon?.name ?? "",
          attackType
        )
      );
    });

    row.append(
      createTotalCell(weakCount, "weak"),
      createTotalCell(resistCount, "resist")
    );

    body.append(row);
  });
}

function resolveTypedSelections() {
  for (let index = 0; index < 6; index++) {
    const control = slotControls[index];
    const query = normalizeSearch(control.input.value);

    control.input.setCustomValidity("");
    control.input.removeAttribute("aria-invalid");

    if (!query) {
      selectedTeam[index] = null;
      renderPreview(index);
      continue;
    }

    if (selectedTeam[index]) continue;

    const exactMatch = pokemonList.find(pokemon =>
      normalizeSearch(pokemon.name) === query ||
      normalizeSearch(pokemon.key) === query ||
      (
        /^#?\d+$/.test(query) &&
        pokemon.dex === Number(query.replace("#", ""))
      )
    );

    if (!exactMatch) {
      control.input.setAttribute("aria-invalid", "true");
      control.input.setCustomValidity(
        "Choose a Pokémon from the search results."
      );
      control.input.reportValidity();
      return false;
    }

    selectPokemon(index, exactMatch);
  }

  return true;
}

form.addEventListener("submit", event => {
  event.preventDefault();

  if (!resolveTypedSelections()) return;

  if (!selectedTeam.some(Boolean)) {
    status.textContent = "Choose at least one Pokémon.";
    results.hidden = true;
    return;
  }

  closeAllSuggestions();
  status.textContent = "";

  results.hidden = false;
  renderCoverage();
});

document.getElementById("clear-button").addEventListener("click", () => {
  selectedTeam.fill(null);

  slotControls.forEach((control, index) => {
    control.input.value = "";
    control.input.setCustomValidity("");
    control.input.removeAttribute("aria-invalid");
    closeSuggestions(control);
    renderPreview(index);
  });

  results.hidden = true;
  status.textContent = "";
  slotControls[0].input.focus();
});

document.addEventListener("click", event => {
  slotControls.forEach(control => {
    if (!control.wrapper.contains(event.target)) {
      closeSuggestions(control);
    }
  });
});

async function loadPokemon() {
  try {
    const response = await fetch("data/pokemon.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    POKEMON = await response.json();

    pokemonList = Object.entries(POKEMON)
      .map(([key, pokemon]) => ({
        ...pokemon,
        key,
        dex: Number(pokemon.dex),
        types: pokemon.types.map(type => type.toLowerCase())
      }))
      .sort((a, b) =>
        a.dex - b.dex || a.name.localeCompare(b.name)
      );

    if (!pokemonList.length) {
      throw new Error("The Pokémon JSON is empty.");
    }

    buildPokemonSearch();

    document.getElementById("analyze-button").disabled = false;
    document.getElementById("clear-button").disabled = false;

    status.textContent = "";
  } catch (error) {
    console.error(error);

    status.textContent =
      "Could not load Pokémon. Check data/pokemon.json and its JSON formatting.";
  }
}

loadPokemon();