// Game State Management
let gameState = {
  beachCompleted: false,
  reefCompleted: false,
  hurricaneCompleted: false,
  hurricaneUnlocked: false,
  currentModule: "home",
  beachItemsCollected: 0,
  totalBeachItems: 10, // Count of actual draggable trash items
};

// Touch state management for ELO touch screens
let touchState = {
  isDragging: false,
  draggedElement: null,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0,
  originalZIndex: "",
  originalPosition: "",
  originalTransform: "",
};

// Initialize game when page loads
document.addEventListener("DOMContentLoaded", function () {
  initializeGame();
  setupDragAndDrop();
  setupTouchSupport();
  updateProgressDisplay();
  setupSliderCursor();

  // Debug: Validate the count of draggable items
  const draggableItems = document.querySelectorAll('[draggable="true"]');
  console.log(
    `Page loaded. Found ${draggableItems.length} draggable items. Expected: ${gameState.totalBeachItems}`
  );
});

// Initialize the game
function initializeGame() {
  // Reset game state completely on page refresh
  // This ensures user has to complete modules again to unlock hurricane
  gameState = {
    beachCompleted: false,
    reefCompleted: false,
    hurricaneCompleted: false,
    hurricaneUnlocked: false,
    beachItemsCollected: 0,
    totalBeachItems: 10 // Keep the total count for completion check
  };
  
  // Clear localStorage to reset all progress
  localStorage.removeItem("crabbyGameState");

  // Update UI based on fresh state
  updateModuleAvailability();
  showScreen("start-screen");
}

// Screen Management
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  // Show the requested screen
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add("active");
    gameState.currentModule = screenId;
  }
}

// Module Management
function startModule(moduleType) {
  if (moduleType === "beach") {
    showScreen("beach-module");
    // If beach module is completed, reset it for a fresh start
    if (gameState.beachCompleted) {
      resetBeachItems();
      gameState.beachItemsCollected = 0;
      gameState.beachCompleted = false;
      updateProgressDisplay();
    }
    showInstructionModal();
  } else if (moduleType === "reef") {
    showScreen("reef-module");
    
    // If reef module is completed, reset it for a fresh start (same as beach module)
    if (gameState.reefCompleted) {
      resetReefProgress();
      gameState.reefCompleted = false;
      saveGameState();
      updateModuleAvailability();
    }
    
    // Initialize reef progress if not already done
    if (reefProgress === 0) {
      updateReefProgress();
    }
    
    // Show reef instruction modal
    showReefInstructionModal();
  } else if (moduleType === "hurricane") {
    // Hurricane module requires completion of either beach OR reef module
    if (gameState.beachCompleted || gameState.reefCompleted) {
      showScreen("hurricane-module");
      // Show hurricane instruction modal
      showHurricaneInstructionModal();
      console.log("Hurricane module started");
    } else {
      showLockedMessage();
    }
  }
}

// Beach Module Functions
function showInstructionModal() {
  // Show the instruction modal
  const modal = document.getElementById("instruction-modal");
  if (modal) {
    modal.style.display = "flex";
  }

  // Move items to different positions instantly (no animation)
  setTimeout(() => {
    shuffleTrashItems();
  }, 100);
}

// Return trash items to their original positions
function triggerTrashAnimations() {
  const trashItems = document.querySelectorAll('[draggable="true"]');
  trashItems.forEach((item, index) => {
    // Simply return item to original position (0,0 transform)
    item.style.transition = "transform 0.8s ease-out";
    item.style.transform = "translate(0, 0)";

    // Make sure items are visible
    item.style.opacity = "1";
    item.style.visibility = "visible";
  });
}

// Move trash items to different positions instantly
function shuffleTrashItems() {
  const trashItems = document.querySelectorAll('[draggable="true"]');
  const positions = [];

  // Store original positions
  trashItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    positions.push({
      x: rect.left,
      y: rect.top,
      item: item,
    });
  });

  // Shuffle positions for items to move to
  const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);

  // Move items to shuffled positions instantly (no transition)
  trashItems.forEach((item, index) => {
    const targetPos = shuffledPositions[index];
    const currentRect = item.getBoundingClientRect();
    const deltaX = targetPos.x - currentRect.left;
    const deltaY = targetPos.y - currentRect.top;

    // Move item instantly to new position (no smooth animation)
    item.style.transition = "none";
    item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  });
}

function closeInstructionModal() {
  // Hide the instruction modal
  const modal = document.getElementById("instruction-modal");
  if (modal) {
    modal.style.display = "none";
  }

  // Trigger trash item animations after a short delay
  setTimeout(() => {
    triggerTrashAnimations();
  }, 300);
}

// Enhanced Touch Support for ELO Touch Screens
function setupTouchSupport() {
  const trashItems = document.querySelectorAll('[draggable="true"]');

  trashItems.forEach((item) => {
    // Remove any existing touch event listeners
    item.removeEventListener("touchstart", handleTouchStart);
    item.removeEventListener("touchmove", handleTouchMove);
    item.removeEventListener("touchend", handleTouchEnd);

    // Add new touch event listeners
    item.addEventListener("touchstart", handleTouchStart, { passive: false });
    item.addEventListener("touchmove", handleTouchMove, { passive: false });
    item.addEventListener("touchend", handleTouchEnd, { passive: false });
  });
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];

  // Store touch state
  touchState.isDragging = true;
  touchState.draggedElement = e.target.closest('[draggable="true"]');
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;

  const rect = touchState.draggedElement.getBoundingClientRect();
  touchState.startLeft = rect.left;
  touchState.startTop = rect.top;

  // Store original styles
  touchState.originalZIndex = touchState.draggedElement.style.zIndex;
  touchState.originalPosition = touchState.draggedElement.style.position;
  touchState.originalTransform = touchState.draggedElement.style.transform;

  // Make element draggable while preserving circular shape
  touchState.draggedElement.style.position = "fixed";
  touchState.draggedElement.style.zIndex = "9999";
  touchState.draggedElement.style.left = touchState.startLeft + "px";
  touchState.draggedElement.style.top = touchState.startTop + "px";
  touchState.draggedElement.style.pointerEvents = "none";

  // Add visual feedback without distorting the circle
  touchState.draggedElement.style.opacity = "0.8";
  touchState.draggedElement.style.transform = "scale(1.05)"; // Reduced scale to prevent distortion
  touchState.draggedElement.style.transition = "none";

  // Ensure the element maintains its aspect ratio
  touchState.draggedElement.style.width = rect.width + "px";
  touchState.draggedElement.style.height = rect.height + "px";

  // Add dragging class
  touchState.draggedElement.classList.add("dragging");
}

function handleTouchMove(e) {
  if (!touchState.isDragging) return;
  e.preventDefault();

  const touch = e.touches[0];
  const deltaX = touch.clientX - touchState.startX;
  const deltaY = touch.clientY - touchState.startY;

  // Update element position with smooth movement
  touchState.draggedElement.style.left = touchState.startLeft + deltaX + "px";
  touchState.draggedElement.style.top = touchState.startTop + deltaY + "px";
}

function handleTouchEnd(e) {
  if (!touchState.isDragging) return;
  e.preventDefault();

  const touch = e.changedTouches[0];
  const endX = touch.clientX;
  const endY = touch.clientY;

  // Find the bin under the touch point
  const bins = document.querySelectorAll("[ondrop]");
  let droppedOnBin = false;

  bins.forEach((bin) => {
    const binRect = bin.getBoundingClientRect();
    if (
      endX >= binRect.left &&
      endX <= binRect.right &&
      endY >= binRect.top &&
      endY <= binRect.bottom
    ) {
      // Extract bin type from ondrop attribute
      const binType = bin
        .getAttribute("ondrop")
        .match(/drop\(event, '(\w+)'\)/)[1];

      // Check if the item is correctly sorted
      if (isCorrectSort(touchState.draggedElement.dataset.type, binType)) {
        handleCorrectSort(touchState.draggedElement, binType);
      } else {
        handleIncorrectSort(touchState.draggedElement);
      }

      droppedOnBin = true;
    }
  });

  // Reset element styles
  resetTouchElement();

  // If not dropped on a bin, animate back to original position
  if (!droppedOnBin) {
    animateBackToOriginal();
  }
}

function resetTouchElement() {
  if (!touchState.draggedElement) return;

  // Remove dragging class
  touchState.draggedElement.classList.remove("dragging");

  // Reset styles
  touchState.draggedElement.style.position = touchState.originalPosition;
  touchState.draggedElement.style.zIndex = touchState.originalZIndex;
  touchState.draggedElement.style.left = "";
  touchState.draggedElement.style.top = "";
  touchState.draggedElement.style.pointerEvents = "";
  touchState.draggedElement.style.opacity = "";
  touchState.draggedElement.style.transform = touchState.originalTransform;
  touchState.draggedElement.style.transition = "";

  // Reset dimensions to original values
  touchState.draggedElement.style.width = "";
  touchState.draggedElement.style.height = "";

  // Reset touch state
  touchState.isDragging = false;
  touchState.draggedElement = null;
}

function animateBackToOriginal() {
  if (!touchState.draggedElement) return;

  // Smooth animation back to original position
  touchState.draggedElement.style.transition = "all 0.3s ease-out";
  touchState.draggedElement.style.left = "";
  touchState.draggedElement.style.top = "";
  touchState.draggedElement.style.opacity = "";
  touchState.draggedElement.style.transform = touchState.originalTransform;

  // Reset after animation
  setTimeout(() => {
    resetTouchElement();
  }, 300);
}

// Drag and Drop Setup (Desktop)
function setupDragAndDrop() {
  const trashItems = document.querySelectorAll('[draggable="true"]');

  if (trashItems.length === 0) {
    console.warn("No draggable items found!");
    return;
  }

  trashItems.forEach((item) => {
    // Remove any existing event listeners first
    item.removeEventListener("dragstart", handleDragStart);
    item.removeEventListener("dragend", handleDragEnd);

    // Add new event listeners
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);
  });
}

function handleDragStart(e) {
  // Store the item type as text/plain (this is what we need for sorting)
  const itemType = e.target.dataset.type;
  e.dataTransfer.setData("text/plain", itemType);

  // Store the unique ID as a custom format to avoid conflicts
  e.dataTransfer.setData("application/x-item-id", e.target.dataset.id);

  e.target.style.opacity = "0.5";
  e.target.classList.add("dragging");
}

function handleDragEnd(e) {
  e.target.style.opacity = "1";
  e.target.classList.remove("dragging");
}

function allowDrop(e) {
  e.preventDefault();
}

function drop(e, binType) {
  e.preventDefault();

  const draggedType = e.dataTransfer.getData("text/plain");
  const draggedId = e.dataTransfer.getData("application/x-item-id");

  // Find the dragged element by its unique ID
  let draggedElement = null;

  if (draggedId) {
    draggedElement = document.querySelector(`[data-id="${draggedId}"]`);
  }

  // If we still can't find it, try the hover method as fallback
  if (!draggedElement) {
    draggedElement = document.querySelector('[draggable="true"]:hover');
  }

  // Make sure we have both the element and the type
  if (draggedElement && draggedType) {
    // Check if the item is correctly sorted
    if (isCorrectSort(draggedType, binType)) {
      handleCorrectSort(draggedElement, binType);
    } else {
      handleIncorrectSort(draggedElement);
    }
  }
}

function isCorrectSort(itemType, binType) {
  // Define correct sorting rules based on actual material types
  const sortingRules = {
    trash: "trash", // Non-recyclable, non-compostable items
    recyclable: "recycle", // Items that can be recycled
    compost: "compost", // Organic items that can be composted
  };

  // Check if the item is sorted into the correct bin
  const isCorrect = sortingRules[itemType] === binType;

  return isCorrect;
}

function handleCorrectSort(item, binType) {
  // Add success animation
  item.style.animation = "correctPulse 0.5s ease";

  // Show educational fact
  const fact = item.dataset.fact;
  showFactBubble(fact, item);

  // Remove item from beach
  setTimeout(() => {
    item.remove();
    gameState.beachItemsCollected++;
    updateProgressDisplay();

    // Debug: Log the current count
    console.log(
      `Items collected: ${gameState.beachItemsCollected}/${gameState.totalBeachItems}`
    );

    // Check if all items are collected (should be exactly equal to total)
    if (gameState.beachItemsCollected === gameState.totalBeachItems) {
      console.log("All items collected! Showing completion modal.");
      showBeachCompletion();
    }
  }, 500);
}

function handleIncorrectSort(item) {
  // Add shake animation
  item.style.animation = "incorrectShake 0.5s ease";

  // Show hint
  showHintBubble(
    "Try a different bin! Remember: \n🔵 Trash for non-recyclable items\n🟢 Recycling for cans, bottles, and paper\n🟡 Compost for food scraps and organic materials"
  );

  // Reset animation after it completes
  setTimeout(() => {
    item.style.animation = "";
  }, 500);
}

function showFactBubble(fact, item) {
  const bubble = document.createElement("div");
  bubble.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";

  // Get the item type to show appropriate illustration
  const itemType = getItemTypeFromFact(fact);
  const { illustration } = getItemIllustration(itemType);

  // Store the timeout ID so we can clear it when button is clicked
  let autoCloseTimeout;

  const closeModal = () => {
    // Clear the auto-close timeout
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
    }
    // Remove the modal immediately
    if (bubble.parentElement) {
      bubble.remove();
    }
  };

  bubble.innerHTML = `
        <div class="bg-white rounded-3xl border-[7px] border-[#FACC15] p-8 max-w-md mx-4 relative">
            <!-- Close Button -->
            <button class="absolute top-[-10px] right-[-10px] bg-[#FB923C] hover:bg-[#FB923C]/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors">
                ×
            </button>
            
            <!-- Item Illustration -->
            <div class="text-center mb-6">
                <img src="${
                  item.querySelector("img").src
                }" alt="Item" class="h-20 w-20 mx-auto mb-4 object-contain" />
            </div>
            
            <!-- Title -->
            <h3 class="text-2xl font-[600] text-center text-[#2563EB] mb-2 font-fredoka">
              Fun Fact! 🤓
            </h3>
            
            <!-- Fact Text -->
            <p class="text-lg text-center text-[#2563EB] mb-8 font-nunito">
                ${fact}
            </p>
            
            <!-- Action Button -->
            <div class="text-center">
                <button class="bg-gradient-to-r from-[#4ADE80] to-[#60A5FA] text-white px-8 py-3 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center gap-3 mx-auto">
                    Keep Cleaning!
                    <svg width="30" height="28" viewBox="0 0 30 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.8081 7.53518L22.2085 14.9356C22.6969 15.424 22.9713 16.0865 22.9713 16.7772C22.9713 17.468 22.6969 18.1304 22.2085 18.6189L19.5554 21.272L8.47224 10.1888L11.1253 7.53574C11.6138 7.0473 12.2762 6.7729 12.967 6.7729C13.6577 6.7729 14.3202 7.0473 14.8086 7.53574L14.8081 7.53518Z" fill="#FEB36D"/>
                        <path d="M28.7851 0.912938C28.5898 0.717626 28.3571 0.563673 28.101 0.460273C27.8449 0.356873 27.5706 0.306147 27.2945 0.311125C27.0183 0.316103 26.746 0.376681 26.4938 0.489244C26.2416 0.601806 26.0146 0.764044 26.561 0.966267L17.348 10.0796L19.6184 12.35L28.7317 3.87151C28.934 3.68339 29.0962 3.45644 29.2088 3.20423C29.3213 2.95201 29.3819 2.6797 29.3869 2.40355C29.3919 2.1274 29.3411 1.85308 29.2377 1.59697C29.1343 1.34087 28.9804 1.10822 28.7851 0.912938Z" fill="#A55D50"/>
                        <path d="M19.5557 21.2794L13.5719 27.2593L6.55291 20.2403L8.65469 16.7778C8.65469 16.7778 3.45906 19.5462 1.05927 17.1464C-1.03859 15.0525 0.647538 13.3664 0.647538 13.3664C4.2237 14.9505 8.47039 10.1941 8.47039 10.1941L19.5557 21.2794Z" fill="#A55D50"/>
                        <path d="M10.3712 8.28809L21.4549 19.3718L19.555 21.2716L8.47135 10.1879L10.3712 8.28809Z" fill="#FEE05B"/>
                        <path d="M12.9719 21.8754L10.58 24.2673L9.61145 23.2988L11.9995 20.9068C12.1279 20.7779 12.3023 20.7052 12.4843 20.7048C12.6663 20.7045 12.841 20.7764 12.97 20.9049C13.0989 21.0333 13.1716 21.2077 13.172 21.3897C13.1723 21.5717 13.1004 21.7464 12.9719 21.8754Z" fill="#774134"/>
                        </svg>

                </button>
            </div>
        </div>
    `;

  // Add event listeners after creating the HTML
  const closeButton = bubble.querySelector("button:first-child");
  const keepCleaningButton = bubble.querySelector("button:last-child");

  closeButton.addEventListener("click", closeModal);
  keepCleaningButton.addEventListener("click", closeModal);

  document.body.appendChild(bubble);

  // Auto-remove after 5 seconds (but can be cancelled by button click)
  autoCloseTimeout = setTimeout(() => {
    if (bubble.parentElement) {
      bubble.remove();
    }
  }, 5000);
}

// Helper function to get item type from fact
function getItemTypeFromFact(fact) {
  if (
    fact.includes("compost") ||
    fact.includes("apple") ||
    fact.includes("banana") ||
    fact.includes("vegetable") ||
    fact.includes("fruit")
  ) {
    return "compost";
  } else if (
    fact.includes("recycled") ||
    fact.includes("recycle") ||
    fact.includes("paper") ||
    fact.includes("aluminum") ||
    fact.includes("bottle")
  ) {
    return "recyclable";
  } else {
    return "trash";
  }
}

// Helper function to get appropriate illustration and color
function getItemIllustration(itemType) {
  switch (itemType) {
    case "compost":
      return { illustration: "🥕", color: "#4ADE80" };
    case "recyclable":
      return { illustration: "♻️", color: "#60A5FA" };
    case "trash":
      return { illustration: "🗑️", color: "#F59E0B" };
    default:
      return { illustration: "🌊", color: "#60A5FA" };
  }
}

function showHintBubble(hint) {
  const bubble = document.createElement("div");
  bubble.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";

  bubble.innerHTML = `
        <div class="bg-white rounded-3xl border-[7px] border-[#FACC15] p-8 max-w-md mx-4 relative">
            <!-- Close Button -->
            <button onclick="this.closest('.fixed').remove()" class="absolute top-[-10px] right-[-10px] bg-[#FB923C] hover:bg-[#FB923C]/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors">
                ×
            </button>
            
            <!-- Hint Icon -->
            <div class="text-center mb-6">
                <div class="text-6xl mb-4">💡</div>
            </div>
            
            <!-- Title -->
            <h3 class="text-2xl font-[600] text-center text-[#2563EB] mb-2 font-fredoka">
              Hint! 🤔
            </h3>
            
            <!-- Hint Text -->
            <p class="text-lg text-center text-[#2563EB] mb-8 font-nunito whitespace-pre-line">
                ${hint}
            </p>
            
            <!-- Action Button -->
            <div class="text-center">
                <button onclick="this.closest('.fixed').remove()" class="bg-gradient-to-r from-[#4ADE80] to-[#60A5FA] text-white px-8 py-3 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center gap-3 mx-auto">
                    Got it!
                    <svg width="30" height="28" viewBox="0 0 30 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.8081 7.53518L22.2085 14.9356C22.6969 15.424 22.9713 16.0865 22.9713 16.7772C22.9713 17.468 22.6969 18.1304 22.2085 18.6189L19.5554 21.272L8.47224 10.1888L11.1253 7.53574C11.6138 7.0473 12.2762 6.7729 12.967 6.7729C13.6577 6.7729 14.3202 7.0473 14.8086 7.53574L14.8081 7.53518Z" fill="#FEB36D"/>
                        <path d="M28.7851 0.912938C28.5898 0.717626 28.3571 0.563673 28.101 0.460273C27.8449 0.356873 27.5706 0.306147 27.2945 0.311125C27.0183 0.316103 26.746 0.376681 26.4938 0.489244C26.2416 0.601806 26.0146 0.764044 26.561 0.966267L17.348 10.0796L19.6184 12.35L28.7317 3.87151C28.934 3.68339 29.0962 3.45644 29.2088 3.20423C29.3213 2.95201 29.3819 2.6797 29.3869 2.40355C29.3919 2.1274 29.3411 1.85308 29.2377 1.59697C29.1343 1.34087 28.9804 1.10822 28.7851 0.912938Z" fill="#A55D50"/>
                        <path d="M19.5557 21.2794L13.5719 27.2593L6.55291 20.2403L8.65469 16.7778C8.65469 16.7778 3.45906 19.5462 1.05927 17.1464C-1.03859 15.0525 0.647538 13.3664 0.647538 13.3664C4.2237 14.9505 8.47039 10.1941 8.47039 10.1941L19.5557 21.2794Z" fill="#A55D50"/>
                        <path d="M10.3712 8.28809L21.4549 19.3718L19.555 21.2716L8.47135 10.1879L10.3712 8.28809Z" fill="#FEE05B"/>
                        <path d="M12.9719 21.8754L10.58 24.2673L9.61145 23.2988L11.9995 20.9068C12.1279 20.7779 12.3023 20.7052 12.4843 20.7048C12.6663 20.7045 12.841 20.7764 12.97 20.9049C13.0989 21.0333 13.1716 21.2077 13.172 21.3897C13.1723 21.5717 13.1004 21.7464 12.9719 21.8754Z" fill="#774134"/>
                        </svg>
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(bubble);

  // Auto-remove after 8 seconds (longer since it's more important)
  setTimeout(() => {
    if (bubble.parentElement) {
      bubble.remove();
    }
  }, 8000);
}

// Progress and Completion
function updateProgressDisplay() {
  const progressElement = document.getElementById("beach-items-count");
  if (progressElement) {
    progressElement.textContent = gameState.beachItemsCollected;
  }

  // Also update mobile progress display
  const mobileProgressElement = document.getElementById(
    "beach-items-count-mobile"
  );
  if (mobileProgressElement) {
    mobileProgressElement.textContent = gameState.beachItemsCollected;
  }
}

function showBeachCompletion() {
  // Mark beach module as completed
  gameState.beachCompleted = true;
  saveGameState();

  // Update module availability
  updateModuleAvailability();

  // Show beach hero win modal immediately
  showPlayAgainButton();
}

function markBeachAsFinished() {
  // Mark beach module as completed
  gameState.beachCompleted = true;
  saveGameState();

  // Update module availability
  updateModuleAvailability();

  // Show beach hero win modal
  showPlayAgainButton();
}

function showPlayAgainButton() {
  // Remove any existing fact modals first
  const existingFactModals = document.querySelectorAll(".fixed.inset-0.z-50");
  existingFactModals.forEach((modal) => {
    if (
      modal.querySelector(
        ".bg-white.rounded-3xl.border-4.border-\\[\\#FACC15\\]"
      )
    ) {
      modal.remove();
    }
  });

  const button = document.createElement("div");
  button.className =
    "fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50";
  button.innerHTML = `
        <div class="bg-white rounded-3xl border-[6px] border-[#FFD042] p-8 max-w-lg mx-4 relative">
            <!-- Close Button -->
            <button onclick="this.parentElement.parentElement.remove()" class="absolute top-[-10px] right-[-10px] bg-[#FB923C] hover:bg-[#FB923C]/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold transition-colors">
                ×
            </button>
            
            <!-- Happy Crab Illustration -->
            <div class="text-center mb-6">
                <img src='./assets/happy.png' class='h-[200px] w-[200px] mx-auto'/>
            </div>
            
            <!-- Title -->
            <h3 class="text-3xl font-[600] text-center text-[#2563EB] mb-2 font-fredoka">
                Great Job! 🎉
            </h3>
            
            <!-- Achievement Text -->
            <p class="text-xl text-center text-[#2563EB] mb-8 font-nunito font-[400]">
               You're a Beach Hero! The beach is sparkling clean! ✨
            </p>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button onclick="startModule('reef')" class="bg-gradient-to-r from-[#20B2AA] to-[#87CEEB] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2">
                    Build a Reef!
                </button>
                <button onclick="goHomeAndCloseModal()" class="bg-gradient-to-r from-[#FB923C] to-[#FACC15] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2">
                    Back to Home
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(button);
}

function goHomeAndCloseModal() {
  // Go to home screen
  goHome();

  // Close the win modal
  const winModal = document.querySelector(".fixed.inset-0.z-\\[60\\]");
  if (winModal) {
    winModal.remove();
  }
}

function goHomeAndCloseReefModal() {
  // Go to home screen
  goHome();

  // Close the reef completion modal
  const reefModal = document.querySelector(".fixed.inset-0.z-\\[80\\]");
  if (reefModal) {
    reefModal.remove();
  }
}

function startHurricaneAndCloseReefModal() {
  // Start hurricane module
  startModule('hurricane');

  // Close the reef completion modal
  const reefModal = document.querySelector(".fixed.inset-0.z-\\[80\\]");
  if (reefModal) {
    reefModal.remove();
  }
}

// Module Management
function completeModule(moduleType) {
  if (moduleType === "beach") {
    // Mark beach as finished immediately when button is clicked
    markBeachAsFinished();
  } else if (moduleType === "reef") {
    // Mark reef as finished immediately when button is clicked
    markReefAsFinished();
  }
}

/**
 * Reset beach items by completely restoring the original HTML structure
 *
 * This ensures that all items are back in their exact original positions
 * with all CSS classes, styles, and positioning intact.
 */
function resetBeachItems() {
  // Reset progress
  gameState.beachItemsCollected = 0;
  updateProgressDisplay();

  // Get the trash container
  const trashContainer = document.getElementById("trash-items");
  if (trashContainer) {
    // Store the original HTML content from the page load
    const originalHTML = `
      <div
        class="translate-transform absolute bottom-[8vh] left-[0vw] flex flex-col items-center bg-white border-[5px] border-[#FDBA74] rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="recyclable"
        data-fact="Soda Can (Aluminum): Lasts 200–500 years! But the good news is it can be recycled forever.
            "
      >
        <img
          src="./assets/firstmodule/can.png"
          draggable="false"
          class="h-12 w-12 rotate-[27.44deg]"
          alt=""
        />
      </div>
      
      <!-- Crabby and Speech Bubble -->
      <div
        class="translate-transform absolute top-[-80px] left-0 flex flex-col items-start transition-all duration-300"
      >
        <div
          id="welcome-speech-bubble"
          class="bg-gradient-to-l from-[#FFFFFF] to-[#FEF3C7] border-4 border-[#FDBA74] rounded-3xl py-5 px-6 max-w-[350px] absolute z-30 left-1/2 shadow-lg animate-bubble-float"
        >
          <p
            class="text-gray-800 flex flex-col text-sm lg:text-lg font-bold m-0 leading-relaxed font-nunito whitespace-nowrap"
          >
            Welcome to the
            <span class="text-[#2563EB]">Beach Cleanup! 🦀</span>
          </p>
          <button
            class="absolute top-[-10px] right-[-10px] bg-[#FB923C] rounded-full p-4 border-none text-2xl font-bold cursor-pointer w-5 h-5 flex items-center justify-center text-white font-comic"
            onclick="closeSpeechBubble('welcome-speech-bubble')"
          >
            ×
          </button>
          <div
            class="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#FEF3C7]"
          ></div>
        </div>
        <div class="relative overflow-hidden">
          <img
            src="assets/happy.png"
            alt="Crabby"
            class="lg:w-80 lg:h-80 w-48 h-48 mt-10 object-contain animate-crabby-wave"
          />
        </div>
      </div>
      
      <div
        class="translate-transform absolute bottom-[12vh] left-[30vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="trash"
        data-fact="Diaper: Never breaks down and can leak harmful chemicals that hurt fish and ocean animals.
            "
      >
        <img
          src="./assets/firstmodule/diaper.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute left-[30vw] md:top-[12vh] md:left-[24vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="compost"
        data-fact="
            Fish Bones: Gone in just a few weeks — they even give nutrients back to nature!
            "
      >
        <img
          src="./assets/firstmodule/fishbone.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute bottom-[18vh] left-[40vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="compost"
        data-fact="Apple Core: Takes about 2 months to break down.
            "
      >
        <img
          src="./assets/firstmodule/apple.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute bottom-[5vh] left-[50vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="compost"
        data-fact="
            Carrot: Can rot in water and uses up oxygen, which makes it harder for fish to breathe.
            "
      >
        <img
          src="./assets/firstmodule/carrot.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute bottom-[22vh] left-[60vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="compost"
        data-fact="Banana Peel: Breaks down in 2–5 weeks.

            "
      >
        <img
          src="./assets/firstmodule/banana.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute bottom-[15vh] left-[70vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="recyclable"
        data-fact="
            Plastic Baby Bottle / Feeder: Sea turtles can mistake it for food and choke.
            "
      >
        <img
          src="./assets/firstmodule/feder.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute sm:bottom-[12vh] sm:left-[85vw] bottom-[9vh] left-[70vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="trash"
        data-fact="Candy Wrapper (plastic or foil): Can last 10–20 years and might never fully go away."
      >
        <img
          src="./assets/firstmodule/toffee.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute left-[50vw] md:top-[10vh] md:left-[65vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="recyclable"
        data-fact="Paper / Newspaper: Breaks down quickly, but soggy paper can stick to animals or cover coral so plants can’t get sunlight.
            "
      >
        <img
          src="./assets/firstmodule/paper.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
      
      <div
        class="translate-transform absolute top-[-4vh] md:top-[12vh] sm:left-[75vw] left-[60vw] flex flex-col items-center bg-white border-2 border-orange-400 rounded-full p-4 cursor-grab transition-all duration-300 shadow-md hover:scale-105 hover:shadow-lg active:cursor-grabbing z-20"
        draggable="true"
        data-type="recyclable"
        data-fact="Plastic Water Bottle: Takes about 450 years to break down!
            "
      >
        <img
          src="./assets/firstmodule/bottle.png"
          draggable="false"
          class="h-12 w-12"
          alt=""
        />
      </div>
    `;

    // Restore the original HTML
    trashContainer.innerHTML = originalHTML;

    // Re-setup functionality
    setupDragAndDrop();
    setupTouchSupport();

    // Debug: Count actual draggable items after reset
    const draggableItems = document.querySelectorAll('[draggable="true"]');
    console.log(
      `Reset complete. Found ${draggableItems.length} draggable items.`
    );

    // Force a small delay to ensure DOM is fully updated
    setTimeout(() => {
      console.log(
        "Reset fully complete. All items should be in original positions."
      );

      // Verify positioning of items
      const items = trashContainer.querySelectorAll('[draggable="true"]');
      items.forEach((item, index) => {
        const computedStyle = window.getComputedStyle(item);
        console.log(
          `Item ${index + 1}: position=${computedStyle.position}, bottom=${
            computedStyle.bottom
          }, left=${computedStyle.left}`
        );
      });
    }, 100);
  }
}

function resetBeachModule() {
  showResetConfirmationModal();
}

function showResetConfirmationModal() {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50";

  const closeModal = () => {
    if (modal.parentElement) {
      modal.remove();
    }
  };

  const confirmReset = () => {
    // Reset progress
    gameState.beachItemsCollected = 0;
    gameState.beachCompleted = false;
    updateProgressDisplay();

    // Clear saved game state
    localStorage.removeItem("crabbyGameState");

    // Reset module availability
    updateModuleAvailability();

    // Reset beach items and stay on beach module
    resetBeachItems();

    // Close modal
    closeModal();

    // Show success message
    showSuccessMessage("Beach module has been reset! You can start over now.");
  };

  modal.innerHTML = `
        <div class="bg-white rounded-3xl border-[7px] border-[#FACC15] p-8 max-w-lg mx-4 relative">
            <!-- Close Button -->
            <button class="absolute top-[-10px] right-[-10px] bg-gradient-to-r from-[#FB923C] to-[#F97316] hover:bg-[#FB923C]/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-4xl font-bold transition-colors">
                ×
            </button>
            
            <!-- Worried Crab Illustration -->
            <div class="text-center mb-6">
                <img src='./assets/sad.png' class='h-[200px] w-[200px] mx-auto'/>
            </div>
            
            <!-- Title -->
            <h3 class="text-3xl font-[600] text-center text-[#2563EB] mb-4 font-fredoka">
                Reset Game
            </h3>
            
            <!-- Confirmation Message -->
            <p class="text-xl text-center text-[#2563EB] mb-8 font-nunito">
                Are you sure you want to reset the game?
            </p>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="bg-gradient-to-r from-[#4ADE80] to-[#60A5FA] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2 w-full">
                    Cancel
                </button>
                <button class="bg-gradient-to-r from-[#FB923C] to-[#FACC15] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2 w-full">
                    Yes, Reset
                </button>
            </div>
        </div>
    `;

  // Add event listeners
  const closeButton = modal.querySelector("button:first-child");
  const cancelButton = modal.querySelector("button:nth-child(2)");
  const resetButton = modal.querySelector("button:last-child");

  closeButton.addEventListener("click", closeModal);
  cancelButton.addEventListener("click", closeModal);
  resetButton.addEventListener("click", confirmReset);

  document.body.appendChild(modal);
}

// Temperature Slider Drag Functions
function startSliderDrag(event) {
  event.preventDefault();
  
  isDraggingSlider = true;
  sliderContainer = document.querySelector('.relative.h-96.rounded-\\[22px\\]');
  
  if (!sliderContainer) return;
  
  const handle = document.getElementById('temperature-slider-handle');
  if (!handle) return;
  
  // Get initial position
  const rect = sliderContainer.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  
  if (event.type === 'mousedown') {
    sliderStartY = event.clientY;
  } else if (event.type === 'touchstart') {
    sliderStartY = event.touches[0].clientY;
  }
  
  sliderStartTop = handleRect.top - rect.top;
  
  // Add event listeners
  document.addEventListener('mousemove', handleSliderDrag);
  document.addEventListener('mouseup', stopSliderDrag);
  document.addEventListener('touchmove', handleSliderDrag, { passive: false });
  document.addEventListener('touchend', stopSliderDrag);
  
  // Add visual feedback
  handle.style.transition = 'none';
  handle.style.transform = 'scale(1.1) translateX(-50%)';
}

function handleSliderDrag(event) {
  if (!isDraggingSlider || !sliderContainer) return;
  
  event.preventDefault();
  
  const rect = sliderContainer.getBoundingClientRect();
  let currentY;
  
  if (event.type === 'mousemove') {
    currentY = event.clientY;
  } else if (event.type === 'touchmove') {
    currentY = event.touches[0].clientY;
  }
  
  const deltaY = currentY - sliderStartY;
  const newTop = sliderStartTop + deltaY;
  
  // Constrain to slider bounds
  const minTop = 20; // top-5 equivalent
  const maxTop = rect.height - 36; // bottom-5 equivalent (20px from bottom)
  
  const constrainedTop = Math.max(minTop, Math.min(maxTop, newTop));
  
  // Update handle position
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    handle.style.top = `${constrainedTop}px`;
  }
}

function stopSliderDrag(event) {
  if (!isDraggingSlider || !sliderContainer) return;
  
  isDraggingSlider = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleSliderDrag);
  document.removeEventListener('mouseup', stopSliderDrag);
  document.removeEventListener('touchmove', handleSliderDrag);
  document.removeEventListener('touchend', stopSliderDrag);
  
  const handle = document.getElementById('temperature-slider-handle');
  if (!handle) return;
  
  // Reset visual feedback
  handle.style.transition = 'all 0.3s ease';
  handle.style.transform = 'translateX(-50%)';
  
  // Snap to nearest level
  snapToNearestLevel();
}

function snapToNearestLevel() {
  const handle = document.getElementById('temperature-slider-handle');
  const sliderContainer = document.querySelector('.relative.h-96.rounded-\\[22px\\]');
  
  if (!handle || !sliderContainer) return;
  
  const rect = sliderContainer.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  const handleTop = handleRect.top - rect.top;
  
  // Define the three snap positions
  const snapPositions = [
    { level: 1, top: 20 },      // top-5 (20px from top)
    { level: 2, top: 176 },     // top-44 (176px from top)
    { level: 3, top: rect.height - 36 }  // bottom-5 (36px from bottom)
  ];
  
  // Find the closest snap position
  let closestLevel = 1;
  let minDistance = Math.abs(handleTop - snapPositions[0].top);
  
  for (let i = 1; i < snapPositions.length; i++) {
    const distance = Math.abs(handleTop - snapPositions[i].top);
    if (distance < minDistance) {
      minDistance = distance;
      closestLevel = snapPositions[i].level;
    }
  }
  
  // Snap to the closest level
  setTemperatureLevel(closestLevel);
}

// Setup slider cursor functionality
function setupSliderCursor() {
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    // Ensure cursor is always visible on hover
    handle.addEventListener('mouseenter', function() {
      this.style.cursor = 'grab';
    });
    
    handle.addEventListener('mouseleave', function() {
      if (!isDraggingSlider) {
        this.style.cursor = 'grab';
      }
    });
    
    handle.addEventListener('mousedown', function() {
      this.style.cursor = 'grabbing';
    });
  }
}

function showSuccessMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[80] font-comic";
  messageDiv.textContent = message;

  document.body.appendChild(messageDiv);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 3000);
}

function updateModuleAvailability() {
  // Update Hurricane Watch button
  const hurricaneButton = document.querySelector(
    'button[onclick="showLockedMessage()"]'
  );
  
  if (hurricaneButton && (gameState.beachCompleted || gameState.reefCompleted)) {
    // Unlock the hurricane module
    hurricaneButton.onclick = () => startModule("hurricane");
    hurricaneButton.classList.remove("opacity-70", "cursor-not-allowed");
    hurricaneButton.classList.add(
      "hover:-translate-y-1",
      "hover:shadow-xl",
      "active:-translate-y-0.5",
      "cursor-pointer"
    );
    
    // Update button appearance to unlocked state
    hurricaneButton.classList.remove("from-[#FFFFFF]", "to-[#000000]/50");
    hurricaneButton.classList.add("from-[#FF6B6B]", "to-[#4ECDC4]");
    
    // Update the description text
    const descriptionSpan = hurricaneButton.querySelector("span:last-child");
    if (descriptionSpan) {
      descriptionSpan.textContent = "Learn about climate and weather!";
    }
    
    // Update game state
    gameState.hurricaneUnlocked = true;
    saveGameState();
  } else if (hurricaneButton) {
    // Ensure button stays locked if conditions not met
    hurricaneButton.onclick = () => showLockedMessage();
    hurricaneButton.classList.add("opacity-70", "cursor-not-allowed");
    hurricaneButton.classList.remove(
      "hover:-translate-y-1",
      "hover:shadow-xl",
      "active:-translate-y-0.5",
      "cursor-pointer"
    );
    
    // Reset button appearance to locked state
    hurricaneButton.classList.remove("from-[#FF6B6B]", "to-[#4ECDC4]");
    hurricaneButton.classList.add("from-[#FFFFFF]", "to-[#000000]/50");
    
    // Reset the description text
    const descriptionSpan = hurricaneButton.querySelector("span:last-child");
    if (descriptionSpan) {
      descriptionSpan.textContent = "Complete one cleanup to unlock!";
    }
    
    // Update game state
    gameState.hurricaneUnlocked = false;
    saveGameState();
  }
}

// Utility Functions
function goHome() {
  showScreen("start-screen");
}

function showLockedMessage() {
  // Only hurricane module is locked and requires completion of either beach OR reef
  alert(
    "Complete one cleanup to unlock!"
  );
}

function saveGameState() {
  localStorage.setItem("crabbyGameState", JSON.stringify(gameState));
}

// Function to close the welcome speech bubble
function closeSpeechBubble(bubbleId) {
  const bubble = document.getElementById(bubbleId);
  if (bubble) {
    bubble.style.display = "none";
  }
}

function closeReefWelcomeSpeechBubble() {
  const bubble = document.getElementById("reef-welcome-speech-bubble");
  if (bubble) {
    bubble.style.display = "none";
  }
}

// Reef Module Functions
function showReefInstructionModal() {
  // Show the reef instruction modal
  const modal = document.getElementById("reef-instruction-modal");
  if (modal) {
    modal.style.display = "flex";
  }

  // Hide the existing Crabby message since we now have the instruction modal
  const crabbyMessage = document.getElementById("crabby-message");
  if (crabbyMessage) {
    crabbyMessage.style.display = "none";
  }
}

function closeReefInstructionModal() {
  // Hide the reef instruction modal
  const modal = document.getElementById("reef-instruction-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Crabby Says Modal Functions
function showCrabbySaysModal() {
  // Show the crabby says modal
  const modal = document.getElementById("crabby-says-modal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeCrabbySaysModal() {
  // Hide the crabby says modal
  const modal = document.getElementById("crabby-says-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function markReefAsFinished() {
  gameState.reefCompleted = true;
  saveGameState();

  // Show the same completion modal as when playing
  showReefCompletionMessage();

  // Update module availability to unlock hurricane module
  updateModuleAvailability();
}

// Function to update hurricane module status display
function updateHurricaneModuleStatus() {
  const beachStatus = document.getElementById('beach-status');
  const reefStatus = document.getElementById('reef-status');
  
  if (beachStatus) {
    beachStatus.textContent = gameState.beachCompleted ? '✅ Completed' : '❌ Not Completed';
    beachStatus.className = gameState.beachCompleted ? 
      'text-sm text-green-600 font-semibold' : 
      'text-sm text-red-600 font-semibold';
  }
  
  if (reefStatus) {
    reefStatus.textContent = gameState.reefCompleted ? '✅ Completed' : '❌ Not Completed';
    reefStatus.className = gameState.reefCompleted ? 
      'text-sm text-green-600 font-semibold' : 
      'text-sm text-red-600 font-semibold';
  }
}


function resetReefModule() {
  showReefResetConfirmationModal();
}

function showReefResetConfirmationModal() {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50";

  const closeModal = () => {
    if (modal.parentElement) {
      modal.remove();
    }
  };

  const confirmReset = () => {
    // Reset progress
    gameState.reefCompleted = false;
    resetReefProgress();
    updateProgressDisplay();

    // Clear saved game state
    localStorage.removeItem("crabbyGameState");

    // Reset module availability
    updateModuleAvailability();

    // Close modal
    closeModal();

    // Show success message
    showSuccessMessage("Reef module has been reset! You can start over now.");
  };

  modal.innerHTML = `
        <div class="bg-white rounded-3xl border-[7px] border-[#FACC15] p-8 max-w-lg mx-4 relative">
            <!-- Close Button -->
            <button class="absolute top-[-10px] right-[-10px] bg-gradient-to-r from-[#FB923C] to-[#F97316] hover:bg-[#FB923C]/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-4xl font-bold transition-colors">
                ×
            </button>
            
            <!-- Worried Crab Illustration -->
            <div class="text-center mb-6">
                <img src='./assets/sad.png' class='h-[200px] w-[200px] mx-auto'/>
            </div>
            
            <!-- Title -->
            <h3 class="text-3xl font-[600] text-center text-[#2563EB] mb-4 font-fredoka">
                Reset Game
            </h3>
            
            <!-- Confirmation Message -->
            <p class="text-xl text-center text-[#2563EB] mb-8 font-nunito">
                Are you sure you want to reset the game?
            </p>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="bg-gradient-to-r from-[#4ADE80] to-[#60A5FA] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2 w-full">
                    Cancel
                </button>
                <button class="bg-gradient-to-r from-[#FB923C] to-[#FACC15] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2 w-full">
                    Yes, Reset
                </button>
            </div>
        </div>
  `;

  // Add event listeners
  const closeButton = modal.querySelector("button:first-child");
  const cancelButton = modal.querySelector("button:nth-child(2)");
  const resetButton = modal.querySelector("button:last-child");

  closeButton.addEventListener("click", closeModal);
  cancelButton.addEventListener("click", closeModal);
  resetButton.addEventListener("click", confirmReset);

  document.body.appendChild(modal);
}

// Temperature Slider Drag Functions
function startSliderDrag(event) {
  event.preventDefault();
  
  isDraggingSlider = true;
  sliderContainer = document.querySelector('.relative.h-96.rounded-\\[22px\\]');
  
  if (!sliderContainer) return;
  
  const handle = document.getElementById('temperature-slider-handle');
  if (!handle) return;
  
  // Get initial position
  const rect = sliderContainer.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  
  if (event.type === 'mousedown') {
    sliderStartY = event.clientY;
  } else if (event.type === 'touchstart') {
    sliderStartY = event.touches[0].clientY;
  }
  
  sliderStartTop = handleRect.top - rect.top;
  
  // Add event listeners
  document.addEventListener('mousemove', handleSliderDrag);
  document.addEventListener('mouseup', stopSliderDrag);
  document.addEventListener('touchmove', handleSliderDrag, { passive: false });
  document.addEventListener('touchend', stopSliderDrag);
  
  // Add visual feedback
  handle.style.transition = 'none';
  handle.style.transform = 'scale(1.1) translateX(-50%)';
}

function handleSliderDrag(event) {
  if (!isDraggingSlider || !sliderContainer) return;
  
  event.preventDefault();
  
  const rect = sliderContainer.getBoundingClientRect();
  let currentY;
  
  if (event.type === 'mousemove') {
    currentY = event.clientY;
  } else if (event.type === 'touchmove') {
    currentY = event.touches[0].clientY;
  }
  
  const deltaY = currentY - sliderStartY;
  const newTop = sliderStartTop + deltaY;
  
  // Constrain to slider bounds
  const minTop = 20; // top-5 equivalent
  const maxTop = rect.height - 36; // bottom-5 equivalent (20px from bottom)
  
  const constrainedTop = Math.max(minTop, Math.min(maxTop, newTop));
  
  // Update handle position
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    handle.style.top = `${constrainedTop}px`;
  }
}

function stopSliderDrag(event) {
  if (!isDraggingSlider || !sliderContainer) return;
  
  isDraggingSlider = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleSliderDrag);
  document.removeEventListener('mouseup', stopSliderDrag);
  document.removeEventListener('touchmove', handleSliderDrag);
  document.removeEventListener('touchend', stopSliderDrag);
  
  const handle = document.getElementById('temperature-slider-handle');
  if (!handle) return;
  
  // Reset visual feedback
  handle.style.transition = 'all 0.3s ease';
  handle.style.transform = 'translateX(-50%)';
  
  // Snap to nearest level
  snapToNearestLevel();
}

function snapToNearestLevel() {
  const handle = document.getElementById('temperature-slider-handle');
  const sliderContainer = document.querySelector('.relative.h-96.rounded-\\[22px\\]');
  
  if (!handle || !sliderContainer) return;
  
  const rect = sliderContainer.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  const handleTop = handleRect.top - rect.top;
  
  // Define the three snap positions
  const snapPositions = [
    { level: 1, top: 20 },      // top-5 (20px from top)
    { level: 2, top: 176 },     // top-44 (176px from top)
    { level: 3, top: rect.height - 36 }  // bottom-5 (36px from bottom)
  ];
  
  // Find the closest snap position
  let closestLevel = 1;
  let minDistance = Math.abs(handleTop - snapPositions[0].top);
  
  for (let i = 1; i < snapPositions.length; i++) {
    const distance = Math.abs(handleTop - snapPositions[i].top);
    if (distance < minDistance) {
      minDistance = distance;
      closestLevel = snapPositions[i].level;
    }
  }
  
  // Snap to the closest level
  setTemperatureLevel(closestLevel);
}

// Setup slider cursor functionality
function setupSliderCursor() {
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    // Ensure cursor is always visible on hover
    handle.addEventListener('mouseenter', function() {
      this.style.cursor = 'grab';
    });
    
    handle.addEventListener('mouseleave', function() {
      if (!isDraggingSlider) {
        this.style.cursor = 'grab';
      }
    });
    
    handle.addEventListener('mousedown', function() {
      this.style.cursor = 'grabbing';
    });
  }
}

// Reef Building Functions
let reefProgress = 0;
const maxReefPieces = 6; // 6 placement spots: left-seabed, left-coral, middle-left-seabed, middle-right-seabed, right-coral, above-middle-right
let selectedReefItem = null;
const placedItems = [];

function selectReefItem(itemType) {
  // Remove previous selection
  document.querySelectorAll('[onclick^="selectReefItem"]').forEach((el) => {
    el.classList.remove("ring-4", "ring-yellow-400");
    el.classList.add("border-white/40");
  });

  // Select new item
  selectedReefItem = itemType;
  const selectedElement = document.querySelector(
    `[onclick="selectReefItem('${itemType}')"]`
  );
  if (selectedElement) {
    selectedElement.classList.add("ring-4", "ring-yellow-400");
    selectedElement.classList.remove("border-white/40");
  }

  showSuccessMessage(`Selected: ${getItemDisplayName(itemType)}`);
}

function getItemDisplayName(itemType) {
  const names = {
    "reef-ball": "Reef Ball",
    "sunken-ship": "Sunken Ship",
    "coral-plug": "Coral Plug",
    "concrete-block": "Concrete Block",
  };
  return names[itemType] || itemType;
}

function placeReefItem(spotIndex, spotLocation) {
  if (!selectedReefItem) {
    showSuccessMessage(
      "Please select an item from the Reef Builder Kit first!"
    );
    return;
  }

  if (placedItems[spotIndex]) {
    showSuccessMessage("This spot is already occupied! Choose another spot.");
    return;
  }

  // Place the item
  placedItems[spotIndex] = {
    type: selectedReefItem,
    location: spotLocation,
    spotIndex: spotIndex,
  };

  console.log(
    `Placed ${selectedReefItem} at spot ${spotIndex} (${spotLocation})`
  );
  console.log(`Placed items:`, placedItems);

  reefProgress++;

  // Update progress display
  updateReefProgress();

  // Add visual item to the spot
  addReefItemVisual(spotIndex, selectedReefItem);

  // Show fact modal
  showOceanFactModal(selectedReefItem);

  // Hide the placement spot
  hidePlacementSpot(spotIndex);

  // Check if reef is complete
  console.log(`Reef Progress: ${reefProgress}/${maxReefPieces}`);
  if (reefProgress >= maxReefPieces) {
    console.log("Reef Complete! Showing animated celebration screen...");
    showReefCelebrationScreen();
  }

  // Reset selection
  selectedReefItem = null;
  document.querySelectorAll('[onclick^="selectReefItem"]').forEach((el) => {
    el.classList.remove("ring-4", "ring-yellow-400");
    el.classList.add("border-white/40");
  });
}

function addReefItemVisual(spotIndex, itemType) {
  const placementSpots = document.getElementById("placement-spots");
  if (!placementSpots) return;

  // Find the spot by its onclick attribute instead of by index
  const spot = Array.from(placementSpots.children).find((spot) => {
    const onclick = spot.getAttribute("onclick");
    return onclick && onclick.includes(`placeReefItem(${spotIndex},`);
  });

  if (!spot) return;

  // Create the visual item
  const itemElement = document.createElement("div");
  itemElement.className =
    "absolute inset-0 flex items-center justify-center z-20";
  itemElement.id = `reef-item-${spotIndex}`;

  // Different visuals based on item type
  let itemEmoji = "🏀";
  let itemClass = "text-4xl";

  switch (itemType) {
    case "reef-ball":
      itemEmoji = "🏀";
      itemImages = "assets/secondmodule/reefball.png";
      itemClass = "text-4xl";
      break;
    case "sunken-ship":
      itemEmoji = "🚢";
      itemImages = "assets/secondmodule/ship.png";
      itemClass = "text-3xl";
      break;
    case "coral-plug":
      itemEmoji = "🌱";
      itemImages = "assets/secondmodule/coral.png";
      itemClass = "text-3xl";
      break;
    case "concrete-block":
      itemEmoji = "🧱";
      itemImages = "assets/secondmodule/brick1.png";
      itemClass = "text-3xl";
      break;
  }

  itemElement.innerHTML = `<span class="${itemClass} animate-badge-earned"><img src="${itemImages}" class="w-[4vw] h-[4vw] sm:w-8 sm:h-8 lg:w-10 lg:h-10"></span>`;

  // Add to the spot
  spot.appendChild(itemElement);

  // Add glow animation
  setTimeout(() => {
    itemElement.classList.add("animate-badge-glow");
  }, 100);
}

function hidePlacementSpot(spotIndex) {
  const placementSpots = document.getElementById("placement-spots");
  if (!placementSpots) return;

  // Find the spot by its onclick attribute instead of by index
  const spot = Array.from(placementSpots.children).find((spot) => {
    const onclick = spot.getAttribute("onclick");
    return onclick && onclick.includes(`placeReefItem(${spotIndex},`);
  });

  if (spot) {
    spot.style.opacity = "";
    spot.style.pointerEvents = "none";
  }
}

function updateReefProgress() {
  // Update progress in header
  const progressElement = document.getElementById("reef-items-count");
  if (progressElement) {
    progressElement.textContent = reefProgress;
  }

  // Update mobile progress too
  const mobileProgress = document.getElementById("reef-items-count-mobile");
  if (mobileProgress) {
    mobileProgress.textContent = reefProgress;
  }
}

function showReefCelebrationScreen() {
  // Create the animated celebration screen
  const celebrationScreen = document.createElement("div");
  celebrationScreen.className = "fixed inset-0 z-[90] overflow-hidden";
  celebrationScreen.id = "reef-celebration-screen";

  // Add floating bubbles animation
  celebrationScreen.innerHTML = `
    <div class="absolute inset-0 overflow-hidden"
     style="
        background: url('assets/secondmodule/secondmodule.jpg') no-repeat
          center/100% 100%;
      ">
      <!-- Floating bubbles -->
      <div class="bubble bubble-1"></div>
      <div class="bubble bubble-2"></div>
      <div class="bubble bubble-3"></div>
      <div class="bubble bubble-4"></div>
      <div class="bubble bubble-5"></div>
      <div class="bubble bubble-6"></div>
      <div class="bubble bubble-7"></div>
      <div class="bubble bubble-8"></div>
    </div>

    <!-- Sea creatures and reef elements -->
    <div class="absolute inset-0 flex items-center justify-center">
      <!-- Shark and fish -->
      <div class="absolute top-20 left-20 animate-float">
        <img src="assets/animatedscreenimages/shark.png" alt="Shark" class="w-32 h-32">
        <img src="assets/animatedscreenimages/blue.png" alt="Fish" class="w-16 h-16 absolute -top-10 -right-6 animate-swim">
      </div>
      <div class="absolute top-1/2 left-1/4 animate-float">
        <img src="assets/animatedscreenimages/green.png" alt="Shark" class="w-32 h-32">
       
      </div>

      <!-- Crab on rock -->
      <div class="absolute top-[70vh] left-32 animate-float-delayed">
        <img src="assets/animatedscreenimages/crab.png" alt="Crab" class="w-20 h-20">
        
      </div>
      <div class="absolute top-[70vh] left-[29vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/yellow.png" alt="Crab" class="w-20 h-20">
        
      </div>
       <div class="absolute top-[70vh] left-[42vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/multi.png" alt="Crab" class="w-20 h-20">
        
      </div>
             <div class="absolute top-[60vh] left-[50vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/boat.png" alt="Crab" class="w-30 h-30">
        
      </div>
  </div>
             <div class="absolute top-[90vh] left-[60vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/green.png" alt="Crab" class="w-20 h-20">
        
      </div>

      <!-- Clownfish center -->
      <div class="absolute top-[30vh] left-1/2 transform -translate-x-1/2 animate-float">
        <img src="assets/animatedscreenimages/orange.png" alt="Clownfish" class="w-24 h-24">
      </div>

      <!-- Octopus and shipwreck -->
      <div class="absolute top-[50vh] left-[64vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/octopus.png" alt="Octopus" class="w-28 h-28">
      </div>
      <div class="absolute top-[40vh] right-[5vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/colar.png" alt="Octopus" class="w-28 h-28">
      </div>
        <div class="absolute top-[40vh] right-[0vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/yellow.png" alt="Octopus" class="w-28 h-28">
      </div>

      <!-- Coral formations -->
      <div class="absolute bottom-16 left-[15vw] animate-float-delayed">
        <img src="assets/animatedscreenimages/colar.png" alt="Coral" class="w-48 h-48">
      </div>

      <!-- Wooden crates -->
      <div class="absolute bottom-12 left-16 animate-float">
        <img src="assets/animatedscreenimages/orange.png" alt="Crates" class="w-20 h-16">
      </div>
    </div>

     <!-- Crabby and Speech Bubble -->
            <div
              class="translate-transform absolute bottom-0 right-40 flex flex-col items-start transition-all duration-300"
            >
              <div
                id="welcome-speech-bubble"
                class="bg-gradient-to-l from-[#FFFFFF] to-[#FEF3C7] border-4 border-[#FDBA74] rounded-3xl py-5 px-6 max-w-[350px] absolute z-30 left-1/2 shadow-lg animate-bubble-float w-[250px]"
              >
                <p
                  class="text-[#2563EB] text-sm lg:text-lg font-bold m-0 text-center leading-relaxed font-nunito"
                >
                 Your Reef has been grown up.
                  <span class="text-gray-800">Look at the sea creatures!</span>
                </p>
                <button
                  class="absolute top-[-10px] right-[-10px] bg-[#FB923C] rounded-full p-4 border-none text-2xl font-bold cursor-pointer w-5 h-5 flex items-center justify-center text-white font-comic"
                  onclick="closeSpeechBubble('welcome-speech-bubble')"
                >
                  ×
                </button>
                <div
                  class="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#FEF3C7]"
                ></div>
              </div>
              <div class="relative overflow-hidden">
                <img
                  src="assets/happy.png"
                  alt="Crabby"
                  class="lg:w-72 lg:h-72 w-48 h-48 mt-10 object-contain animate-crabby-wave"
                />
              </div>
            </div>
  `;

  // Add the celebration screen to the page
  document.body.appendChild(celebrationScreen);

  // Start countdown timer
  let countdown = 10;
  const countdownElement = document.getElementById('celebration-countdown');
  
  const timer = setInterval(() => {
    countdown--;
    if (countdownElement) {
      countdownElement.textContent = countdown;
    }
    
    if (countdown <= 0) {
      clearInterval(timer);
      // Remove celebration screen
      celebrationScreen.remove();
      // Show win modal
      setTimeout(() => {
        showReefCompletionMessage();
      }, 500);
    }
  }, 1000);
}

function showReefCompletionMessage() {
  // Mark reef as completed when naturally finished
  if (!gameState.reefCompleted) {
    gameState.reefCompleted = true;
    saveGameState();
    console.log("Reef module naturally completed, updating game state");
  }
  
  const messageDiv = document.createElement("div");
  messageDiv.className =
    "fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-50";

  messageDiv.innerHTML = `
    <div class="bg-white rounded-3xl border-[5px] border-[#FFD042] p-8 max-w-lg mx-4 relative text-center">
      <button onclick="this.parentElement.parentElement.remove()" class="absolute top-[-8px] right-[-8px] bg-[#FB923C] hover:bg-[#FB923C]/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold transition-colors">×</button>
      
      <div class="mb-6">
        <div class="relative">
          <img src="assets/happywin.png" alt="Crabby" class="w-32 h-32 mx-auto mb-4" />
         
        </div>
      </div>
      
      <h3 class="text-3xl font-[600] text-[#2563EB] mb-4 font-fredoka">
        You Did It! 🎉
      </h3>
      
      <p class="text-xl text-[#2563EB] mb-8 font-nunito">
        🎖️ Badge Unlocked: Reef Builder! Your reef is 
alive with sea creatures! 🐠
      </p>
      
      <div class="flex gap-4 justify-center">
        <button onclick="startHurricaneAndCloseReefModal()" class="bg-gradient-to-r from-[#43DF7D] to-[#38D1FF] text-white px-6 py-2 rounded-[12px] text-lg font-bold hover:scale-105 transition-transform font-Fredoka">
          Watch Hurricane!
        </button>
        <button onclick="goHomeAndCloseReefModal()" class="bg-gradient-to-r from-[#FB923C] to-[#FFD042] text-white px-6 py-2 rounded-[12px] text-lg font-bold hover:scale-105 transition-transform font-Fredoka">
          Back to Home
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(messageDiv);
  
  // Update module availability to unlock hurricane module
  updateModuleAvailability();
}

function resetReefProgress() {
  reefProgress = 0;
  selectedReefItem = null;
  placedItems.length = 0;
  console.log("Reef progress reset. Placed items cleared.");

  // Remove all placed items
  document.querySelectorAll('[id^="reef-item-"]').forEach((el) => el.remove());

  // Show all placement spots again
  const placementSpots = document.getElementById("placement-spots");
  if (placementSpots) {
    Array.from(placementSpots.children).forEach((spot, index) => {
      spot.style.opacity = "1";
      spot.style.pointerEvents = "auto";
    });
  }

  updateReefProgress();
}

function closeCrabbyMessage() {
  const message = document.getElementById("crabby-message");
  if (message) {
    message.style.display = "none";
  }
}

// Ocean Fact Modal Functions
function showOceanFactModal(itemType) {
  const modal = document.getElementById("ocean-fact-modal");
  const factText = document.getElementById("ocean-fact-text");
  const itemImage = document.getElementById("ocean-fact-item-image");

  if (modal && factText && itemImage) {
    // Set the appropriate fact based on item type
    const facts = {
      "reef-ball":
        "Reef balls help baby fish hide and grow safe from big fish! 🐠",
      "sunken-ship":
        "Sunken ships create artificial reefs that become homes for hundreds of marine species! 🚢",
      "coral-plug":
        "Coral plugs help restore damaged reefs and provide shelter for tiny ocean creatures! 🌱",
      "concrete-block":
        "Concrete blocks create stable foundations for coral growth and fish habitats! 🧱",
    };

    // Set the item image based on item type
    const itemImages = {
      "reef-ball": "assets/secondmodule/reefball.png",
      "sunken-ship": "assets/secondmodule/ship.png",
      "coral-plug": "assets/secondmodule/coral.png",
      "concrete-block": "assets/secondmodule/brick1.png",
    };

    factText.textContent =
      facts[itemType] ||
      "This reef item helps create a healthy ocean ecosystem! 🌊";
    itemImage.src = itemImages[itemType] || "assets/secondmodule/reefball.png";

    // Show the modal
    modal.style.display = "flex";
  }
}

function closeOceanFactModal() {
  const modal = document.getElementById("ocean-fact-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Function to completely reset game state for testing
function resetGameState() {
  console.log("Resetting game state...");
  gameState = {
    beachCompleted: false,
    reefCompleted: false,
    hurricaneUnlocked: false,
    currentModule: "home",
    beachItemsCollected: 0,
    totalBeachItems: 10
  };
  
  // Clear localStorage
  localStorage.removeItem("crabbyGameState");
  
  // Update UI
  updateModuleAvailability();
  updateProgressDisplay();
  
  console.log("Game state reset complete:", gameState);
}

// Hurricane Module Functions
let currentTemperatureLevel = 1;

// Slider drag state
let isDraggingSlider = false;
let sliderStartY = 0;
let sliderStartTop = 0;
let sliderContainer = null;

function setTemperatureLevel(level) {
  currentTemperatureLevel = level;
  updateHurricaneBackground(level);
  updateTemperatureDisplay(level);
  updateCrabbySpeech(level);
  updateSliderHandle(level);
}

function updateSliderHandle(level) {
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    // Position the handle based on the selected level using pixel values
    const positions = {
      1: '20px',      // Calm - top (20px from top)
      2: '176px',     // Breezy - middle (176px from top)
      3: 'calc(100% - 36px)'    // Storm - bottom (36px from bottom)
    };
    
    // Set the position directly using style
    handle.style.top = positions[level];
    
    // Update handle border color based on level
    const borderColors = {
      1: 'border-blue-400',    // Calm - blue
      2: 'border-orange-400',  // Breezy - orange
      3: 'border-red-400'      // Storm - red
    };
    
    // Remove existing border color classes and add the new one
    handle.className = handle.className.replace(/border-\w+-\d+/, '');
    handle.className += ` ${borderColors[level]}`;
  }
}

function updateHurricaneBackground(level) {
  const videoElement = document.getElementById("hurricane-bg-video");
  const backgrounds = {
    1: "assets/thirdmodule/calm (2).mp4", 
    2: "assets/thirdmodule/breeze (2).mp4", // Breezy  
    3: "assets/thirdmodule/storm (2).mp4"   // Storm
  };

  if (videoElement && backgrounds[level]) {
    videoElement.src = backgrounds[level];
    videoElement.load(); // Reload the video with new source
  }
}

function updateTemperatureDisplay(level) {
  const display = document.getElementById("current-temperature");
  const temperatures = {
    1: { 
      temp: "77°F", 
      desc: "Calm and peaceful",
      icon: "assets/thirdmodule/calmi.png",
      color: "#2563EB"
      
    },
    2: { 
      temp: "80°F", 
      desc: "Getting breezy",
      icon: "assets/thirdmodule/breezyi.png",
      color: "#F97316"

    },
    3: { 
      temp: "86°F", 
      desc: "Storm conditions!",
      icon: "assets/thirdmodule/stormi.png",
      color: "#FF7068"
    }
  };
  
  if (display && temperatures[level]) {
    const temp = temperatures[level];
    display.innerHTML = `
      <img src="${temp.icon}" alt="Temperature" class="w-10 h-10">
      <div class="text-2xl font-bold text-[${temp.color}]">${temp.temp}</div>
      <div class="text-[16px] text-[${temp.color}]">${temp.desc}</div>
    `;
  }
}

function updateCrabbySpeech(level) {
  const speechBubble = document.getElementById("crabby-hurricane-speech");
  const messages = {
    1: "The ocean is peaceful when it's cooler!",
    2: "See the clouds <br/> forming? 🌤️",
    3: "The water is getting really warm! Look at that storm!"
  };
  const spanText = {
    1: "Nice and calm!",
    2: "Ooh, it's getting warmer!",
    3: "Whoa! "
  };
  const image = document.getElementById("crabby-hurricane-image");
  const images = {
    1: "assets/happy.png",
    2: "assets/happy.png",
    3: "assets/cry.png"
  };
  if (speechBubble && messages[level]) {
    const messageText = speechBubble.querySelector("p");
    const spanTextElement = document.getElementById("crabby-hurricane-span");
    if (messageText && spanTextElement) {
      // Update the paragraph content to include both the span text and the message
      messageText.innerHTML = `${spanText[level]} <span class="text-gray-800" id="crabby-hurricane-span">${messages[level]}</span>`;
    }
  }
  if (image) {
    image.src = images[level];
  }
}

function closeHurricaneSpeechBubble() {
  const speechBubble = document.getElementById("crabby-hurricane-speech");
  if (speechBubble) {
    speechBubble.style.display = "none";
  }
}

function showHurricaneInstructionModal() {
  const modal = document.getElementById("hurricane-instruction-modal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeHurricaneInstructionModal() {
  const modal = document.getElementById("hurricane-instruction-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function showHurricaneHint() {
  const modal = document.getElementById("hurricane-hint-modal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeHurricaneHintModal() {
  const modal = document.getElementById("hurricane-hint-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function markHurricaneCompleted() {
  gameState.hurricaneCompleted = true;
  saveGameState();
  showHurricaneCompletionModal();
}

function showHurricaneCompletionModal() {
  const modal = document.getElementById("hurricane-completion-modal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function goHomeFromHurricane() {
  const modal = document.getElementById("hurricane-completion-modal");
  if (modal) {
    modal.style.display = "none";
  }
  showScreen("start-screen");
}

function resetHurricaneModule() {
  showHurricaneResetConfirmationModal();
}

function showHurricaneResetConfirmationModal() {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50";

  const closeModal = () => {
    if (modal.parentElement) {
      modal.remove();
    }
  };

  const confirmReset = () => {
    // Reset temperature level
    currentTemperatureLevel = 1;
    setTemperatureLevel(1);
    
    // Reset completion status
    gameState.hurricaneCompleted = false;
    saveGameState();
    
    // Show speech bubble again
    const speechBubble = document.getElementById("crabby-hurricane-speech");
    if (speechBubble) {
      speechBubble.style.display = "block";
    }
    
    // Close modal
    closeModal();

    // Show success message
    showSuccessMessage("Hurricane module has been reset! You can start over now.");
  };

  modal.innerHTML = `
        <div class="bg-white rounded-3xl border-[7px] border-[#FACC15] p-8 max-w-lg mx-4 relative">
            <!-- Close Button -->
            <button class="absolute top-[-10px] right-[-10px] bg-gradient-to-r from-[#FB923C] to-[#FB923C]/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-4xl font-bold transition-colors">
                ×
            </button>
            
            <!-- Worried Crab Illustration -->
            <div class="text-center mb-6">
                <img src='./assets/sad.png' class='h-[200px] w-[200px] mx-auto'/>
            </div>
            
            <!-- Title -->
            <h3 class="text-3xl font-[600] text-center text-[#2563EB] mb-4 font-fredoka">
                Reset Hurricane Module
            </h3>
            
            <!-- Confirmation Message -->
            <p class="text-xl text-center text-[#2563EB] mb-8 font-nunito">
                Are you sure you want to reset the game?
            </p>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="bg-gradient-to-r from-[#4ADE80] to-[#60A5FA] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2 w-full">
                    Cancel
                </button>
                <button class="bg-gradient-to-r from-[#FB923C] to-[#FACC15] text-white px-8 py-2 rounded-[12px] text-xl font-bold hover:scale-105 transition-transform font-Fredoka flex items-center justify-center gap-2 w-full">
                    Yes, Reset
                </button>
            </div>
        </div>
  `;

  // Add event listeners
  const closeButton = modal.querySelector("button:first-child");
  const cancelButton = modal.querySelector("button:nth-child(2)");
  const resetButton = modal.querySelector("button:last-child");

  closeButton.addEventListener("click", closeModal);
  cancelButton.addEventListener("click", closeModal);
  resetButton.addEventListener("click", confirmReset);

  document.body.appendChild(modal);
}

// Temperature Slider Drag Functions
function startSliderDrag(event) {
  event.preventDefault();
  
  isDraggingSlider = true;
  sliderContainer = document.querySelector('.relative.h-96.rounded-\\[22px\\]');
  
  if (!sliderContainer) return;
  
  const handle = document.getElementById('temperature-slider-handle');
  if (!handle) return;
  
  // Get initial position
  const rect = sliderContainer.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  
  if (event.type === 'mousedown') {
    sliderStartY = event.clientY;
  } else if (event.type === 'touchstart') {
    sliderStartY = event.touches[0].clientY;
  }
  
  sliderStartTop = handleRect.top - rect.top;
  
  // Add event listeners
  document.addEventListener('mousemove', handleSliderDrag);
  document.addEventListener('mouseup', stopSliderDrag);
  document.addEventListener('touchmove', handleSliderDrag, { passive: false });
  document.addEventListener('touchend', stopSliderDrag);
  
  // Add visual feedback
  handle.style.transition = 'none';
  handle.style.transform = 'scale(1.1) translateX(-50%)';
}

function handleSliderDrag(event) {
  if (!isDraggingSlider || !sliderContainer) return;
  
  event.preventDefault();
  
  const rect = sliderContainer.getBoundingClientRect();
  let currentY;
  
  if (event.type === 'mousemove') {
    currentY = event.clientY;
  } else if (event.type === 'touchmove') {
    currentY = event.touches[0].clientY;
  }
  
  const deltaY = currentY - sliderStartY;
  const newTop = sliderStartTop + deltaY;
  
  // Constrain to slider bounds
  const minTop = 20; // top-5 equivalent
  const maxTop = rect.height - 36; // bottom-5 equivalent (20px from bottom)
  
  const constrainedTop = Math.max(minTop, Math.min(maxTop, newTop));
  
  // Update handle position
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    handle.style.top = `${constrainedTop}px`;
  }
}

function stopSliderDrag(event) {
  if (!isDraggingSlider || !sliderContainer) return;
  
  isDraggingSlider = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleSliderDrag);
  document.removeEventListener('mouseup', stopSliderDrag);
  document.removeEventListener('touchmove', handleSliderDrag);
  document.removeEventListener('touchend', stopSliderDrag);
  
  const handle = document.getElementById('temperature-slider-handle');
  if (!handle) return;
  
  // Reset visual feedback
  handle.style.transition = 'all 0.3s ease';
  handle.style.transform = 'translateX(-50%)';
  
  // Snap to nearest level
  snapToNearestLevel();
}

function snapToNearestLevel() {
  const handle = document.getElementById('temperature-slider-handle');
  const sliderContainer = document.querySelector('.relative.h-96.rounded-\\[22px\\]');
  
  if (!handle || !sliderContainer) return;
  
  const rect = sliderContainer.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  const handleTop = handleRect.top - rect.top;
  
  // Define the three snap positions
  const snapPositions = [
    { level: 1, top: 20 },      // top-5 (20px from top)
    { level: 2, top: 176 },     // top-44 (176px from top)
    { level: 3, top: rect.height - 36 }  // bottom-5 (36px from bottom)
  ];
  
  // Find the closest snap position
  let closestLevel = 1;
  let minDistance = Math.abs(handleTop - snapPositions[0].top);
  
  for (let i = 1; i < snapPositions.length; i++) {
    const distance = Math.abs(handleTop - snapPositions[i].top);
    if (distance < minDistance) {
      minDistance = distance;
      closestLevel = snapPositions[i].level;
    }
  }
  
  // Snap to the closest level
  setTemperatureLevel(closestLevel);
}

// Setup slider cursor functionality
function setupSliderCursor() {
  const handle = document.getElementById('temperature-slider-handle');
  if (handle) {
    // Ensure cursor is always visible on hover
    handle.addEventListener('mouseenter', function() {
      this.style.cursor = 'grab';
    });
    
    handle.addEventListener('mouseleave', function() {
      if (!isDraggingSlider) {
        this.style.cursor = 'grab';
      }
    });
    
    handle.addEventListener('mousedown', function() {
      this.style.cursor = 'grabbing';
    });
  }
}
