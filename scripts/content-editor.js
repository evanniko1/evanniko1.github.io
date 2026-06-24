(() => {
  "use strict";

  const form = document.getElementById("content-form");
  const status = document.getElementById("editor-status");
  const sourceLabel = document.getElementById("source-label");
  const publishButton = document.getElementById("publish-content");
  const sessionBase = window.location.pathname.replace(/\/+$/, "");
  const containers = {
    skill: document.getElementById("skills-list"),
    project: document.getElementById("projects-list"),
    publication: document.getElementById("publications-list"),
  };

  let sourceRevision = null;
  let fieldId = 0;
  let dirty = false;

  function setStatus(message, tone) {
    status.textContent = message;
    if (tone) {
      status.dataset.tone = tone;
    } else {
      delete status.dataset.tone;
    }
  }

  function markDirty() {
    dirty = true;
    setStatus("Unsaved changes");
  }

  function createButton(label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    return button;
  }

  function createField(labelText, fieldName, value, options) {
    const settings = options || {};
    const wrapper = document.createElement("div");
    wrapper.className = "editor-field" + (settings.wide ? " editor-field--wide" : "");

    const label = document.createElement("label");
    const id = "editor-field-" + (++fieldId);
    label.htmlFor = id;
    label.textContent = labelText;

    const control = document.createElement(settings.multiline ? "textarea" : "input");
    control.id = id;
    control.dataset.field = fieldName;
    control.value = value == null ? "" : String(value);
    control.required = settings.required !== false;

    if (!settings.multiline) {
      control.type = settings.type || "text";
    }
    if (settings.placeholder) {
      control.placeholder = settings.placeholder;
    }
    if (settings.min != null) {
      control.min = String(settings.min);
    }
    if (settings.max != null) {
      control.max = String(settings.max);
    }

    control.addEventListener("input", () => {
      control.setCustomValidity("");
      markDirty();
    });

    wrapper.append(label, control);
    return wrapper;
  }

  function moveCard(card, direction) {
    const container = card.parentElement;
    if (direction === "up" && card.previousElementSibling) {
      container.insertBefore(card, card.previousElementSibling);
    }
    if (direction === "down" && card.nextElementSibling) {
      container.insertBefore(card.nextElementSibling, card);
    }
    renumber(container);
    markDirty();
  }

  function removeCard(card) {
    const container = card.parentElement;
    if (container.children.length === 1) {
      setStatus("Each section must keep at least one entry.", "error");
      return;
    }
    card.remove();
    renumber(container);
    markDirty();
  }

  function createCard(kind, data) {
    const card = document.createElement("article");
    card.className = "editor-card";
    card.dataset.kind = kind;

    const header = document.createElement("div");
    header.className = "editor-card__header";

    const title = document.createElement("h3");
    title.dataset.cardTitle = "true";

    const controls = document.createElement("div");
    controls.className = "editor-card__controls";
    const moveUp = createButton("Move up", "up");
    const moveDown = createButton("Move down", "down");
    const remove = createButton("Remove", "remove");
    controls.append(moveUp, moveDown, remove);

    moveUp.addEventListener("click", () => moveCard(card, "up"));
    moveDown.addEventListener("click", () => moveCard(card, "down"));
    remove.addEventListener("click", () => removeCard(card));

    header.append(title, controls);

    const fields = document.createElement("div");
    fields.className = "editor-fields";

    if (kind === "skill") {
      fields.append(
        createField("Group name", "title", data.title, { placeholder: "LLMs & Agents" }),
        createField("Skills or models, one per line", "items", (data.items || []).join("\n"), {
          multiline: true,
          wide: true,
          placeholder: "Claude Sonnet 4.6\nGPT-4.1",
        })
      );
    }

    if (kind === "project") {
      fields.append(
        createField("Project title", "title", data.title, { wide: true }),
        createField("Short description", "description", data.description, {
          multiline: true,
          wide: true,
        })
      );
    }

    if (kind === "publication") {
      fields.append(
        createField("Publication title", "title", data.title, { wide: true }),
        createField("Year", "year", data.year, { type: "number", min: 1900, max: 2100 }),
        createField("Publication URL", "url", data.url, { type: "url" }),
        createField("Authors", "authors", data.authors, { multiline: true, wide: true }),
        createField("Venue", "venue", data.venue),
        createField("Venue prefix", "venuePrefix", data.venuePrefix, {
          required: false,
          placeholder: "In: ",
        }),
        createField("Volume, issue, pages, or other details", "details", data.details, {
          wide: true,
          placeholder: " 13(1): 7755.",
        })
      );
    }

    card.append(header, fields);
    return card;
  }

  function renumber(container) {
    const cards = Array.from(container.children);
    const labels = {
      skill: "Skill group",
      project: "Project",
      publication: "Publication",
    };

    cards.forEach((card, index) => {
      card.querySelector("[data-card-title]").textContent = labels[card.dataset.kind] + " " + (index + 1);
      card.querySelector('[data-action="up"]').disabled = index === 0;
      card.querySelector('[data-action="down"]').disabled = index === cards.length - 1;
      card.querySelector('[data-action="remove"]').disabled = cards.length === 1;
    });
  }

  function appendCard(kind, data, shouldMarkDirty, position) {
    const card = createCard(kind, data);
    const container = containers[kind];
    if (position === "top") {
      container.prepend(card);
    } else {
      container.append(card);
    }
    renumber(container);

    if (shouldMarkDirty) {
      markDirty();
      const firstInput = card.querySelector("input, textarea");
      firstInput.focus();
    }
  }

  function defaultEntry(kind) {
    if (kind === "skill") {
      return { title: "", items: [] };
    }
    if (kind === "project") {
      return { title: "", description: "" };
    }
    return {
      authors: "",
      year: new Date().getFullYear(),
      title: "",
      url: "",
      venue: "",
      venuePrefix: "",
      details: ".",
    };
  }

  function renderData(data, sourceName) {
    if (!data || !Array.isArray(data.skills) || !Array.isArray(data.projects) || !Array.isArray(data.publications)) {
      throw new Error("The selected file does not use the expected site.json structure.");
    }
    if (!data.skills.length || !data.projects.length || !data.publications.length) {
      throw new Error("Skills, projects, and publications must each contain at least one entry.");
    }

    Object.values(containers).forEach((container) => {
      container.replaceChildren();
    });

    data.skills.forEach((entry) => appendCard("skill", entry, false));
    data.projects.forEach((entry) => appendCard("project", entry, false));
    data.publications.forEach((entry) => appendCard("publication", entry, false));

    dirty = false;
    sourceLabel.textContent = sourceName;
    setStatus("Content loaded and ready to edit.", "success");
  }

  function requiredValue(card, fieldName, label) {
    const control = card.querySelector('[data-field="' + fieldName + '"]');
    const value = control.value.trim();
    if (!value) {
      control.setCustomValidity(label + " is required.");
      control.reportValidity();
      throw new Error(label + " is required.");
    }
    return value;
  }

  function collectData() {
    if (!form.reportValidity()) {
      throw new Error("Complete the highlighted required fields.");
    }

    const skills = Array.from(containers.skill.children).map((card, index) => {
      const itemsControl = card.querySelector('[data-field="items"]');
      const items = itemsControl.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      if (!items.length) {
        itemsControl.setCustomValidity("Enter at least one skill or model.");
        itemsControl.reportValidity();
        throw new Error("Skill group " + (index + 1) + " needs at least one item.");
      }
      return {
        title: requiredValue(card, "title", "Skill group name"),
        items,
      };
    });

    const projects = Array.from(containers.project.children).map((card) => ({
      title: requiredValue(card, "title", "Project title"),
      description: requiredValue(card, "description", "Project description"),
    }));

    const publications = Array.from(containers.publication.children).map((card) => {
      const year = Number(requiredValue(card, "year", "Publication year"));
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new Error("Publication year must be between 1900 and 2100.");
      }
      return {
        authors: requiredValue(card, "authors", "Publication authors"),
        year,
        title: requiredValue(card, "title", "Publication title"),
        url: requiredValue(card, "url", "Publication URL"),
        venue: requiredValue(card, "venue", "Publication venue"),
        venuePrefix: card.querySelector('[data-field="venuePrefix"]').value,
        details: requiredValue(card, "details", "Publication details"),
      };
    });

    return { skills, projects, publications };
  }

  function jsonText() {
    return JSON.stringify(collectData(), null, 2) + "\n";
  }

  async function loadPublished() {
    setStatus("Loading repository content...");
    const response = await fetch(sessionBase + "/api/content", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not load content/site.json.");
    }
    sourceRevision = payload.revision;
    renderData(payload.content, "Local content/site.json on " + payload.branch);
  }

  async function copyJson() {
    const text = jsonText();
    await navigator.clipboard.writeText(text);
    setStatus("Updated JSON copied to the clipboard.", "success");
  }

  function downloadJson() {
    const blob = new Blob([jsonText()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded a backup site.json.", "success");
  }

  async function publishContent() {
    const content = collectData();
    if (!window.confirm("Commit these changes and push them to GitHub?")) {
      return;
    }

    publishButton.disabled = true;
    setStatus("Building, committing, and pushing the update...");
    try {
      const response = await fetch(sessionBase + "/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, revision: sourceRevision }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Publishing failed.");
      }
      sourceRevision = payload.revision;
      dirty = false;
      setStatus(payload.message, "success");
    } finally {
      publishButton.disabled = false;
    }
  }

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.add;
      const position = kind === "project" || kind === "publication" ? "top" : "bottom";
      appendCard(kind, defaultEntry(kind), true, position);
    });
  });

  document.getElementById("load-published").addEventListener("click", () => {
    loadPublished().catch((error) => setStatus(error.message, "error"));
  });

  document.getElementById("validate-content").addEventListener("click", () => {
    try {
      collectData();
      setStatus("Everything is valid and ready to publish.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  document.getElementById("copy-json").addEventListener("click", () => {
    copyJson().catch(() => setStatus("Clipboard access was blocked. Use Download site.json instead.", "error"));
  });

  document.getElementById("download-json").addEventListener("click", () => {
    try {
      downloadJson();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  publishButton.addEventListener("click", () => {
    publishContent().catch((error) => setStatus(error.message, "error"));
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dirty) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });

  loadPublished().catch((error) => setStatus(error.message, "error"));
})();
