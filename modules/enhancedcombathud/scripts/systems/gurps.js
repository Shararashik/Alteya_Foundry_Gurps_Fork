// GURPS integration for Argon - Combat HUD
// File: modules/enhancedcombathud/scripts/systems/gurps.js
// NOTE: This file runs AFTER the built-in GURPS adapter in index.js.
// index.js already registers: GurpsPortrait, GurpsMovement, DrawerPanel, PassTurnPanel.
// This file only patches GurpsMovement to fix maneuver-based movement updates and red color.

Hooks.once("argonInit", (CoreHud) => {

  const MovementHud = CoreHud.ARGON.MovementHud;

  class GurpsMovement extends MovementHud {

    // Current move value from GURPS actor — respects encumbrance & maneuver
    get movementMax() {
      const system = this.actor?.system;
      if (!system) return 5;

      // conditions.move === "None" means maneuver forbids all movement (e.g. Do Nothing)
      if (system.conditions?.move === "None") return 0;

      // Find the currently active encumbrance level and read its currentmove
      const enc = system.encumbrance;
      if (enc) {
        const current = Object.values(enc).find(e => e.current);
        if (current != null) return current.currentmove ?? 0;
      }

      // Fallback to top-level basicmove
      return system.basicmove?.value ?? 5;
    }

    // Reset movement used at start of each turn
    _onNewTurn(combat, updates) {
      this.movementUsed = 0;
      this.render();
    }

    _onNewRound(combat, updates) {
      this.movementUsed = 0;
      this.render();
    }

    // Override updateMovement to support "over budget" red display
    updateMovement() {
      if (!this.element) return;

      this.updateMovementUsed();

      const max = this.movementMax;
      const used = this.movementUsed;

      const barsContainer = this.element.querySelector(".movement-spaces");
      const currentEl = this.element.querySelector(".movement-current");
      const maxEl = this.element.querySelector(".movement-max");

      if (!barsContainer || !currentEl || !maxEl) return;

      let newHtml = "";

      // max === 0: maneuver forbids all movement (e.g. Do Nothing, Concentrate)
      if (max === 0) {
        currentEl.innerText = 0;
        currentEl.style.color = "#ff4444";
        maxEl.innerText = 0;
        barsContainer.innerHTML = "";
        return;
      }

      const overBudget = used > max;

      if (overBudget) {
        // All bars used, show remaining as negative red number
        for (let i = 0; i < max; i++) {
          newHtml += `<div class="movement-space"></div>`;
        }
        const remaining = max - used; // negative
        currentEl.innerText = remaining;
        currentEl.style.color = "#ff4444";
        maxEl.innerText = max;
      } else {
        const disabledBars = used % max;
        const activeBars = max - disabledBars;
        const movementColor = this.movementColor;

        for (let i = 0; i < activeBars; i++) {
          newHtml += `<div class="movement-space ${movementColor}"></div>`;
        }
        for (let i = 0; i < disabledBars; i++) {
          newHtml += `<div class="movement-space"></div>`;
        }
        currentEl.innerText = activeBars;
        currentEl.style.color = "";
        maxEl.innerText = ((Math.floor(used / max) + 1) * max) || 0;
      }

      barsContainer.innerHTML = newHtml;
    }
  }



  // Re-render movement when maneuver changes (currentmove updates with actor)
  Hooks.on("updateActor", (actor) => {
    if (ui.ARGON?._actor === actor) {
      ui.ARGON.components?.movement?.render();
    }
  });

  // Also catch token updates (posture, encumbrance etc.)
  Hooks.on("updateToken", (tokenDoc) => {
    if (ui.ARGON?._token?.document === tokenDoc) {
      ui.ARGON.components?.movement?.render();
    }
  });
});
